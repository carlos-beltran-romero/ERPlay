/**
 * Módulo de servicio de sesiones de test
 * Gestiona el ciclo completo de exámenes: creación, progreso, finalización y consulta
 * @module services/testSession
 */

import { AppDataSource } from "../data-source";
import { Diagram } from "../models/Diagram";
import { Question, ReviewStatus } from "../models/Question";
import { TestSession, TestMode } from "../models/TestSession";
import { TestResult } from "../models/TestResult";
import { TestEvent } from "../models/TestEvent";
import { User } from "../models/User";
import { Brackets } from "typeorm";

/** Parámetros para iniciar sesión */
type StartSessionArgs = { userId: string; mode: TestMode; limit?: number };

/** Parámetros para actualizar resultado de pregunta */
type PatchResultArgs = {
  userId: string;
  sessionId: string;
  resultId: string;
  body: {
    selectedIndex?: number | null;
    attemptsDelta?: number;
    usedHint?: boolean;
    revealedAnswer?: boolean;
    timeSpentSecondsDelta?: number;
  };
};

/** Parámetros para registrar evento de sesión */
type LogEventArgs = {
  userId: string;
  sessionId: string;
  type: string;
  resultId?: string;
  payload?: any;
};

/** Parámetros para finalizar sesión */
type FinishSessionArgs = { userId: string; sessionId: string };

/** Parámetros para listar sesiones del usuario */
type ListMineArgs = {
  userId: string;
  mode?: TestMode;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
};

/** Parámetros para obtener detalle de sesión */
type GetOneArgs = { userId: string; sessionId: string };

/**
 * Servicio de sesiones de test
 * Orquesta la lógica completa de exámenes y tests de práctica
 */
export class TestSessionsService {
  private diagramRepo = AppDataSource.getRepository(Diagram);
  private questionRepo = AppDataSource.getRepository(Question);
  private sessionRepo = AppDataSource.getRepository(TestSession);
  private resultRepo = AppDataSource.getRepository(TestResult);
  private eventRepo = AppDataSource.getRepository(TestEvent);
  private userRepo = AppDataSource.getRepository(User);

  /**
   * Inicia una nueva sesión de test
   * Selecciona diagrama aleatorio y preguntas aprobadas
   *
   * @param params - Usuario, modo (learning/exam) y límite de preguntas
   * @returns Datos de sesión y preguntas snapshot
   * @throws {Error} Si no hay tests disponibles o preguntas aprobadas
   * @remarks
   * - Elige diagrama aleatorio con preguntas aprobadas
   * - Baraja preguntas y toma hasta `limit` (default: 10)
   * - Crea snapshots inmutables de prompts/opciones
   * - Modo learning: expone correctIndex y hint desde el inicio
   * - Modo exam: oculta correctIndex (revelado al finalizar)
   */
  async startSession({ userId, mode, limit = 10 }: StartSessionArgs) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });

    const rows = await this.diagramRepo
      .createQueryBuilder("d")
      .innerJoin("d.questions", "q", "q.status = :st", {
        st: ReviewStatus.APPROVED,
      })
      .select("d.id", "id")
      .groupBy("d.id")
      .getRawMany<{ id: string }>();
    if (!rows.length) throw new Error("No hay tests disponibles");

    const diagramId = rows[Math.floor(Math.random() * rows.length)].id;
    const diagram = await this.diagramRepo.findOne({
      where: { id: diagramId },
      relations: { questions: { options: true } },
    });
    if (!diagram) throw new Error("Test no encontrado");

    const approved = (diagram.questions || []).filter(
      (q) => q.status === ReviewStatus.APPROVED
    );
    if (!approved.length)
      throw new Error("El test no tiene preguntas aprobadas");

    const chosen = approved
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(limit, approved.length));

    const sess = await AppDataSource.transaction(async (m) => {
      const s = m.create(TestSession, {
        user,
        diagram,
        mode,
        totalQuestions: chosen.length,
      });
      await m.save(s);

      const results: TestResult[] = [];
      chosen.forEach((q, i) => {
        const opts = (q.options || [])
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((o) => o.text);
        const r = m.create(TestResult, {
          session: s,
          question: q,
          orderIndex: i,
          promptSnapshot: q.prompt,
          optionsSnapshot: opts,
          correctIndexAtTest: q.correctOptionIndex,
          selectedIndex: null,
          usedHint: false,
          revealedAnswer: false,
          attemptsCount: 0,
          timeSpentSeconds: 0,
          isCorrect: null,
        });
        results.push(r);
      });
      await m.save(results);
      return s;
    });

    const results = await this.resultRepo.find({
      where: { session: { id: sess.id } },
      order: { orderIndex: "ASC" },
      relations: { question: true },
    });

    return {
      sessionId: sess.id,
      diagram: {
        id: diagram.id,
        title: diagram.title,
        path: diagram.path ?? null,
      },
      questions: results.map((r) => ({
        resultId: r.id,
        questionId: r.question?.id,
        prompt: r.promptSnapshot,
        options: r.optionsSnapshot,
        ...(mode === "learning" ? { correctIndex: r.correctIndexAtTest } : {}),
        hint: r.question?.hint || undefined,
      })),
    };
  }

  /**
   * Actualiza el resultado de una pregunta durante la sesión
   * Gestiona respuestas, intentos, pistas y tiempo invertido
   *
   * @param params - IDs de sesión/resultado y actualizaciones parciales
   * @returns Confirmación de operación
   * @throws {Error} Si el resultado no existe o no pertenece al usuario
   * @remarks
   * - selectedIndex: Marca respuesta y calcula isCorrect automáticamente
   * - attemptsDelta: Incrementa contador de intentos
   * - usedHint/revealedAnswer: Flags booleanos (solo pueden activarse, nunca resetear)
   * - timeSpentSecondsDelta: Acumula tiempo (nunca resta, usa Math.max(0))
   */
  async patchResult({ userId, sessionId, resultId, body }: PatchResultArgs) {
    const result = await this.resultRepo.findOne({
      where: { id: resultId, session: { id: sessionId, user: { id: userId } } },
      relations: { session: true },
    });
    if (!result) throw new Error("Resultado no encontrado");

    if (typeof body.selectedIndex !== "undefined") {
      result.selectedIndex = body.selectedIndex;
      if (body.selectedIndex !== null) {
        result.isCorrect = body.selectedIndex === result.correctIndexAtTest;
      } else {
        result.isCorrect = null;
      }
      result.attemptsCount += 1;
    }
    if (typeof body.attemptsDelta === "number") {
      result.attemptsCount += body.attemptsDelta;
    }
    if (typeof body.usedHint === "boolean")
      result.usedHint = result.usedHint || body.usedHint;
    if (typeof body.revealedAnswer === "boolean")
      result.revealedAnswer = result.revealedAnswer || body.revealedAnswer;
    if (typeof body.timeSpentSecondsDelta === "number")
      result.timeSpentSeconds += Math.max(0, body.timeSpentSecondsDelta);

    await this.resultRepo.save(result);
    return { ok: true };
  }

  /**
   * Registra evento de telemetría durante la sesión
   * Útil para análisis de comportamiento y debugging
   *
   * @param params - Usuario, sesión, tipo de evento y payload opcional
   * @returns Confirmación de operación
   * @throws {Error} Si la sesión no existe
   * @remarks
   * - Tipos comunes: 'question_viewed', 'hint_used', 'answer_revealed'
   * - payload: JSON libre para metadata adicional
   * - resultId: Opcional, asocia evento a pregunta específica
   */
  async logEvent({ userId, sessionId, type, resultId, payload }: LogEventArgs) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, user: { id: userId } },
    });
    if (!session) throw new Error("Sesión no encontrada");

    const result = resultId
      ? await this.resultRepo.findOne({
          where: { id: resultId, session: { id: sessionId } },
        })
      : null;

    const ev = this.eventRepo.create({
      session,
      result: result || null,
      type,
      payload: payload || null,
    });
    await this.eventRepo.save(ev);
    return { ok: true };
  }

  /**
   * Finaliza una sesión de test
   * Calcula duración, nota y contadores con precisión SQL (servidor)
   *
   * @param params - Usuario y sesión a finalizar
   * @returns Resumen final con métricas calculadas
   * @throws {Error} Si la sesión no existe
   * @remarks
   * - Idempotente: múltiples llamadas retornan el mismo resultado
   * - Duración: TIMESTAMPDIFF(SECOND, createdAt, NOW()) en MySQL
   * - Nota (modo exam): (correctas / total) * 10, redondeado a 2 decimales
   * - Usa NOW() y TIMESTAMPDIFF para evitar desfases de timezone
   * - Recuenta correctas/incorrectas desde TestResult (authoritative source)
   */
  async finishSession({ userId, sessionId }: FinishSessionArgs) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, user: { id: userId } },
      relations: { diagram: true },
    });
    if (!session) throw new Error("Sesión no encontrada");

    if (session.completedAt) {
      const duration =
        typeof session.durationSeconds === "number"
          ? session.durationSeconds
          : Math.max(
              0,
              Math.floor((+session.completedAt - +session.createdAt) / 1000)
            );
      return {
        sessionId: session.id,
        mode: session.mode,
        diagram: { id: session.diagram.id },
        totals: {
          totalQuestions: session.totalQuestions,
          correct: session.correctCount ?? 0,
          incorrect: session.incorrectCount ?? 0,
          durationSeconds: duration,
          score: session.score ?? null,
        },
      };
    }

    const results = await this.resultRepo.find({
      where: { session: { id: sessionId } },
    });
    const correct = results.filter((r) => r.isCorrect === true).length;
    const incorrect = results.filter((r) => r.isCorrect === false).length;

    const score =
      session.mode === "exam" && session.totalQuestions
        ? Math.round((correct / session.totalQuestions) * 1000) / 100
        : null;

    await this.sessionRepo.update(session.id, {
      correctCount: correct,
      incorrectCount: incorrect,
      score,
    });

    await this.sessionRepo
      .createQueryBuilder()
      .update(TestSession)
      .set({
        completedAt: () => "NOW()",
        durationSeconds: () =>
          "GREATEST(0, TIMESTAMPDIFF(SECOND, createdAt, NOW()))",
      })
      .where("id = :id", { id: session.id })
      .execute();

    const updated = await this.sessionRepo.findOneOrFail({
      where: { id: session.id },
      relations: { diagram: true },
    });

    return {
      sessionId: updated.id,
      mode: updated.mode,
      diagram: { id: updated.diagram.id },
      totals: {
        totalQuestions: updated.totalQuestions,
        correct,
        incorrect,
        durationSeconds: updated.durationSeconds ?? 0,
        score: updated.score ?? null,
      },
    };
  }

  /**
   * Lista sesiones del usuario con filtros opcionales
   * Usado en vista "Mis tests" del estudiante
   *
   * @param params - Usuario y filtros de modo, fecha y búsqueda
   * @returns Array de sesiones ordenadas cronológicamente (desc)
   * @remarks
   * - mode: Filtra por 'learning' o 'exam'
   * - dateFrom/dateTo: Rango de fechas (formato YYYY-MM-DD)
   * - q: Búsqueda en título del diagrama (case-insensitive)
   * - skippedCount: Calculado como total - correct - incorrect
   * - noteLabel: Nota en formato "8.50" o fracción "7/10" según disponibilidad
   */
  async listMine({ userId, mode, dateFrom, dateTo, q }: ListMineArgs) {
    const qb = this.sessionRepo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.diagram", "d")
      .where("s.userId = :uid", { uid: userId })
      .orderBy("s.createdAt", "DESC");

    if (mode) qb.andWhere("s.mode = :m", { m: mode });
    if (dateFrom)
      qb.andWhere("s.createdAt >= :df", {
        df: new Date(dateFrom + "T00:00:00"),
      });
    if (dateTo)
      qb.andWhere("s.createdAt <= :dt", { dt: new Date(dateTo + "T23:59:59") });
    if (q && q.trim()) {
      const t = `%${q.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where("LOWER(d.title) LIKE :t", { t });
        })
      );
    }

    const rows = await qb.getMany();

    return rows.map((s) => {
      const duration =
        typeof s.durationSeconds === "number"
          ? s.durationSeconds
          : s.completedAt
          ? Math.max(0, Math.floor((+s.completedAt - +s.createdAt) / 1000))
          : null;

      return {
        id: s.id,
        mode: s.mode as TestMode,
        startedAt: s.createdAt,
        finishedAt: s.completedAt ?? null,
        diagram: s.diagram
          ? {
              id: s.diagram.id,
              title: s.diagram.title,
              path: s.diagram.path ?? null,
            }
          : null,
        questionCount: s.totalQuestions ?? 0,
        totalQuestions: s.totalQuestions ?? 0,
        correctCount: s.correctCount ?? 0,
        wrongCount: s.incorrectCount ?? 0,
        skippedCount: Math.max(
          0,
          (s.totalQuestions ?? 0) -
            (s.correctCount ?? 0) -
            (s.incorrectCount ?? 0)
        ),
        score: s.score ?? null,
        summary: {
          durationSeconds: duration,
          accuracyPct: s.totalQuestions
            ? Math.round((100 * (s.correctCount ?? 0)) / s.totalQuestions)
            : null,
          score: s.score ?? null,
          noteLabel:
            s.score != null
              ? `${s.score}`
              : s.totalQuestions
              ? `${s.correctCount ?? 0}/${s.totalQuestions}`
              : null,
        },
      };
    });
  }

  /**
   * Obtiene detalle completo de una sesión finalizada
   * Incluye todas las preguntas, respuestas y estado de reclamaciones
   *
   * @param params - Usuario y sesión a consultar
   * @returns Datos completos de sesión y resultados individuales
   * @throws {Error} Si la sesión no existe
   * @remarks
   * - Expone correctIndex siempre (sesión ya finalizada)
   * - claimed: true si existe al menos una reclamación
   * - claimStatus: Estado de la primera reclamación encontrada
   * - Duración: Usa valor persistido o calcula fallback si es necesario
   */
  async getOne({ userId, sessionId }: GetOneArgs) {
    const s = await this.sessionRepo.findOne({
      where: { id: sessionId, user: { id: userId } },
      relations: { diagram: true },
    });
    if (!s) throw new Error("Sesión no encontrada");

    const results = await this.resultRepo.find({
      where: { session: { id: s.id } },
      order: { orderIndex: "ASC" },
      relations: { claims: true },
    });

    const duration =
      typeof s.durationSeconds === "number"
        ? s.durationSeconds
        : s.completedAt
        ? Math.max(0, Math.floor((+s.completedAt - +s.createdAt) / 1000))
        : null;

    return {
      id: s.id,
      mode: s.mode as TestMode,
      startedAt: s.createdAt,
      finishedAt: s.completedAt ?? null,
      durationSeconds: duration ?? null,
      diagram: s.diagram
        ? {
            id: s.diagram.id,
            title: s.diagram.title,
            path: s.diagram.path ?? null,
          }
        : null,
      summary: {
        durationSeconds: duration ?? null,
        accuracyPct: s.totalQuestions
          ? Math.round((100 * (s.correctCount ?? 0)) / s.totalQuestions)
          : null,
        score: s.score ?? null,
      },
      results: results.map((r) => ({
        resultId: r.id,
        prompt: r.promptSnapshot,
        options: r.optionsSnapshot,
        correctIndex: r.correctIndexAtTest,
        selectedIndex: r.selectedIndex,
        usedHint: r.usedHint,
        revealedAnswer: r.revealedAnswer,
        timeSpentSeconds: r.timeSpentSeconds,

        claimed: (r.claims?.length ?? 0) > 0,
        claimId: r.claims?.[0]?.id ?? null,
        claimStatus: r.claims?.[0]?.status ?? null,
        claimCreatedAt: r.claims?.[0]?.createdAt ?? null,
      })),
    };
  }
}
