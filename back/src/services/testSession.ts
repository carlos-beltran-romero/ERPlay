import { AppDataSource } from '../data-source';
import { Diagram } from '../models/Diagram';
import { Question, ReviewStatus } from '../models/Question';
import { TestSession, TestMode } from '../models/TestSession';
import { TestResult } from '../models/TestResult';
import { TestEvent } from '../models/TestEvent';
import { User } from '../models/User';
import { Brackets } from 'typeorm';

// ❌ (el import de "duration" de zod era innecesario y lo quitamos)

type StartSessionArgs = { userId: string; mode: TestMode; limit?: number };
type PatchResultArgs = {
  userId: string; sessionId: string; resultId: string;
  body: {
    selectedIndex?: number | null;
    attemptsDelta?: number;
    usedHint?: boolean;
    revealedAnswer?: boolean;
    timeSpentSecondsDelta?: number;
  }
};
type LogEventArgs = { userId: string; sessionId: string; type: string; resultId?: string; payload?: any };
type FinishSessionArgs = { userId: string; sessionId: string };
type ListMineArgs = { userId: string; mode?: TestMode; dateFrom?: string; dateTo?: string; q?: string };
type GetOneArgs = { userId: string; sessionId: string };

export class TestSessionsService {
  private diagramRepo = AppDataSource.getRepository(Diagram);
  private questionRepo = AppDataSource.getRepository(Question);
  private sessionRepo = AppDataSource.getRepository(TestSession);
  private resultRepo  = AppDataSource.getRepository(TestResult);
  private eventRepo   = AppDataSource.getRepository(TestEvent);
  private userRepo    = AppDataSource.getRepository(User);

  // ======= Crear sesión =======
  async startSession({ userId, mode, limit = 10 }: StartSessionArgs) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });

    // 1) Escoge diagrama con preguntas aprobadas
    const rows = await this.diagramRepo.createQueryBuilder('d')
      .innerJoin('d.questions','q','q.status = :st', { st: ReviewStatus.APPROVED })
      .select('d.id','id').groupBy('d.id')
      .getRawMany<{id:string}>();
    if (!rows.length) throw new Error('No hay tests disponibles');

    const diagramId = rows[Math.floor(Math.random() * rows.length)].id;
    const diagram = await this.diagramRepo.findOne({
      where: { id: diagramId },
      relations: { questions: { options: true } }
    });
    if (!diagram) throw new Error('Test no encontrado');

    const approved = (diagram.questions || []).filter(q => q.status === ReviewStatus.APPROVED);
    if (!approved.length) throw new Error('El test no tiene preguntas aprobadas');

    const chosen = approved.sort(()=>Math.random()-0.5).slice(0, Math.min(limit, approved.length));

    // 2) Crea session + results snapshot
    const sess = await AppDataSource.transaction(async (m) => {
      const s = m.create(TestSession, {
        user, diagram, mode, totalQuestions: chosen.length
      });
      await m.save(s);

      const results: TestResult[] = [];
      chosen.forEach((q, i) => {
        const opts = (q.options || []).slice().sort((a,b)=>a.orderIndex-b.orderIndex).map(o=>o.text);
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
          isCorrect: null
        });
        results.push(r);
      });
      await m.save(results);
      return s;
    });

    const results = await this.resultRepo.find({
      where: { session: { id: sess.id } },
      order: { orderIndex: 'ASC' },
      relations: { question: true }
    });

    return {
      sessionId: sess.id,
      diagram: { id: diagram.id, title: diagram.title, path: diagram.path ?? null },
      questions: results.map(r => ({
        resultId: r.id,
        questionId: r.question?.id,
        prompt: r.promptSnapshot,
        options: r.optionsSnapshot,
        ...(mode === 'learning' ? { correctIndex: r.correctIndexAtTest } : {}),
        hint: r.question?.hint || undefined
      }))
    };
  }

  // ======= Guardar resultado =======
  async patchResult({ userId, sessionId, resultId, body }: PatchResultArgs) {
    const result = await this.resultRepo.findOne({
      where: { id: resultId, session: { id: sessionId, user: { id: userId } } },
      relations: { session: true }
    });
    if (!result) throw new Error('Resultado no encontrado');

    if (typeof body.selectedIndex !== 'undefined') {
      result.selectedIndex = body.selectedIndex;
      if (body.selectedIndex !== null) {
        result.isCorrect = body.selectedIndex === result.correctIndexAtTest;
      } else {
        result.isCorrect = null;
      }
      result.attemptsCount += 1;
    }
    if (typeof body.attemptsDelta === 'number') {
      result.attemptsCount += body.attemptsDelta;
    }
    if (typeof body.usedHint === 'boolean') result.usedHint = result.usedHint || body.usedHint;
    if (typeof body.revealedAnswer === 'boolean') result.revealedAnswer = result.revealedAnswer || body.revealedAnswer;
    if (typeof body.timeSpentSecondsDelta === 'number') result.timeSpentSeconds += Math.max(0, body.timeSpentSecondsDelta);

    await this.resultRepo.save(result);
    return { ok: true };
  }

  // ======= Log de eventos =======
  async logEvent({ userId, sessionId, type, resultId, payload }: LogEventArgs) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, user: { id: userId } } });
    if (!session) throw new Error('Sesión no encontrada');

    const result = resultId
      ? await this.resultRepo.findOne({ where: { id: resultId, session: { id: sessionId } } })
      : null;

    const ev = this.eventRepo.create({
      session, result: result || null, type, payload: payload || null
    });
    await this.eventRepo.save(ev);
    return { ok: true };
  }

  // ======= Finalizar sesión (DURACIÓN = fin − inicio, autoritativa) =======
  async finishSession({ userId, sessionId }: FinishSessionArgs) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, user: { id: userId } },
      relations: { diagram: true }
    });
    if (!session) throw new Error('Sesión no encontrada');

    // Idempotencia: si ya está cerrada, devolvemos lo que hay (o calculamos fallback JS)
    if (session.completedAt) {
      const duration =
        typeof session.durationSeconds === 'number'
          ? session.durationSeconds
          : Math.max(0, Math.floor((+session.completedAt - +session.createdAt) / 1000));
      return {
        sessionId: session.id,
        mode: session.mode,
        diagram: { id: session.diagram.id },
        totals: {
          totalQuestions: session.totalQuestions,
          correct: session.correctCount ?? 0,
          incorrect: session.incorrectCount ?? 0,
          durationSeconds: duration,
          score: session.score ?? null
        }
      };
    }

    // Recontar correctas/incorrectas (siempre en server)
    const results = await this.resultRepo.find({ where: { session: { id: sessionId } } });
    const correct = results.filter(r => r.isCorrect === true).length;
    const incorrect = results.filter(r => r.isCorrect === false).length;

    // Calcular nota (mantengo tu escala 0..10)
    const score = session.mode === 'exam' && session.totalQuestions
      ? Math.round((correct / session.totalQuestions) * 1000) / 100
      : null;

    // Guardar contadores/nota primero
    await this.sessionRepo.update(session.id, {
      correctCount: correct,
      incorrectCount: incorrect,
      score
    });

    // Fijar fin y duración EN LA BASE DE DATOS (NOW() y TIMESTAMPDIFF)
    await this.sessionRepo
      .createQueryBuilder()
      .update(TestSession)
      .set({
        // @ts-ignore — usamos funciones SQL
        completedAt: () => 'NOW()',
        durationSeconds: () => 'GREATEST(0, TIMESTAMPDIFF(SECOND, createdAt, NOW()))',
      })
      .where('id = :id', { id: session.id })
      .execute();

    // Recargar sesión ya actualizada para responder al cliente
    const updated = await this.sessionRepo.findOneOrFail({
      where: { id: session.id },
      relations: { diagram: true }
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
        score: updated.score ?? null
      }
    };
  }

  // ======= Listado para "Mis tests" =======
  async listMine({ userId, mode, dateFrom, dateTo, q }: ListMineArgs) {
    const qb = this.sessionRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.diagram', 'd')
      .where('s.userId = :uid', { uid: userId })
      .orderBy('s.createdAt', 'DESC');

    if (mode) qb.andWhere('s.mode = :m', { m: mode });
    if (dateFrom) qb.andWhere('s.createdAt >= :df', { df: new Date(dateFrom + 'T00:00:00') });
    if (dateTo) qb.andWhere('s.createdAt <= :dt', { dt: new Date(dateTo + 'T23:59:59') });
    if (q && q.trim()) {
      const t = `%${q.trim().toLowerCase()}%`;
      qb.andWhere(new Brackets(b => {
        b.where('LOWER(d.title) LIKE :t', { t });
      }));
    }

    const rows = await qb.getMany();

    return rows.map(s => {
      // ⬇️ Fallback por si quedan sesiones antiguas sin durationSeconds persistido
      const duration =
        typeof s.durationSeconds === 'number'
          ? s.durationSeconds
          : (s.completedAt ? Math.max(0, Math.floor((+s.completedAt - +s.createdAt) / 1000)) : null);

      return {
        id: s.id,
        mode: s.mode as TestMode,
        startedAt: s.createdAt,
        finishedAt: s.completedAt ?? null,
        diagram: s.diagram ? { id: s.diagram.id, title: s.diagram.title, path: s.diagram.path ?? null } : null,
        questionCount: s.totalQuestions ?? 0,
        totalQuestions: s.totalQuestions ?? 0,
        correctCount: s.correctCount ?? 0,
        wrongCount: s.incorrectCount ?? 0,
        skippedCount: Math.max(0, (s.totalQuestions ?? 0) - (s.correctCount ?? 0) - (s.incorrectCount ?? 0)),
        score: s.score ?? null,
        summary: {
          durationSeconds: duration,
          accuracyPct: (s.totalQuestions ? Math.round((100 * (s.correctCount ?? 0)) / s.totalQuestions) : null),
          score: s.score ?? null,
          noteLabel: s.score != null
            ? `${s.score}`
            : (s.totalQuestions ? `${s.correctCount ?? 0}/${s.totalQuestions}` : null),
        }
      };
    });
  }

  // ======= Detalle de una sesión =======
  async getOne({ userId, sessionId }: GetOneArgs) {
    const s = await this.sessionRepo.findOne({
      where: { id: sessionId, user: { id: userId } },
      relations: { diagram: true }
    });
    if (!s) throw new Error('Sesión no encontrada');

    const results = await this.resultRepo.find({
      where: { session: { id: s.id } },
      order: { orderIndex: 'ASC' },
      relations: { claims: true },
    });

    // ⬇️ Fallback de duración si no quedó guardada
    const duration =
      typeof s.durationSeconds === 'number'
        ? s.durationSeconds
        : (s.completedAt ? Math.max(0, Math.floor((+s.completedAt - +s.createdAt) / 1000)) : null);

    return {
      id: s.id,
      mode: s.mode as TestMode,
      startedAt: s.createdAt,
      finishedAt: s.completedAt ?? null,
      durationSeconds: duration ?? null,
      diagram: s.diagram ? { id: s.diagram.id, title: s.diagram.title, path: s.diagram.path ?? null } : null,
      summary: {
        durationSeconds: duration ?? null,
        accuracyPct: (s.totalQuestions ? Math.round((100 * (s.correctCount ?? 0)) / s.totalQuestions) : null),
        score: s.score ?? null,
      },
      results: results.map(r => ({
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
