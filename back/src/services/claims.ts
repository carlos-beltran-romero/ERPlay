/**
 * @module services/claims
 * Reclamaciones sobre preguntas y resultados de test.
 */

import { env } from '../config/env';
import { defaultMailer } from '../config/mailer';
import { createHttpError } from '../core/errors/HttpError';
import { AppDataSource } from '../data-source';
import { Claim, ClaimStatus } from '../models/Claim';
import { Diagram } from '../models/Diagram';
import { Question, ReviewStatus } from '../models/Question';
import { TestResult } from '../models/TestResult';
import { User, UserRole } from '../models/User';
import { escapeHtml, letterFromIndex, renderCardEmail } from './shared/emailTemplates';

const transporter = defaultMailer;

// ===== helpers =====
function norm(s: string) {
  return (s ?? '').toString().trim().replace(/\s+/g, ' ');
}
function arraysEqualText(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (norm(a[i]) !== norm(b[i])) return false;
  return true;
}

/**
 * Gestiona el ciclo de vida de las reclamaciones generadas por estudiantes.
 * Encapsula transacciones, notificaciones y reglas de negocio.
 *
 * @public
 */
export class ClaimsService {
  private claimRepo = AppDataSource.getRepository(Claim);
  private questionRepo = AppDataSource.getRepository(Question);
  private diagramRepo = AppDataSource.getRepository(Diagram);
  private userRepo = AppDataSource.getRepository(User);
  private resultRepo = AppDataSource.getRepository(TestResult);

  // ================== Crear reclamación ==================
  /**
   * Crea una nueva reclamación para una pregunta, enlazando el resultado si existe.
   * Valida integridad, evita duplicados y dispara la notificación a supervisores.
   *
   * @public
   * @param params - Datos enviados por el alumno.
   * @returns Resumen de la reclamación creada.
   */
  async createClaim(params: {
    studentId: string;
    testResultId?: string | null;   // ⬅️ NUEVO
    questionId?: string | null;
    diagramId: string;
    prompt: string;
    options: string[];
    chosenIndex: number;
    correctIndex: number;
    explanation: string;
  }) {
    const student = await this.userRepo.findOneByOrFail({ id: params.studentId });
    const diagram = await this.diagramRepo.findOneBy({ id: params.diagramId });
    if (!diagram) throw createHttpError(404, 'Diagrama no encontrado');

    if (!params.prompt?.trim()) throw createHttpError(400, 'El enunciado es obligatorio');
    if (!Array.isArray(params.options) || params.options.length < 2) {
      throw createHttpError(400, 'Mínimo 2 opciones');
    }
    if (params.chosenIndex < 0 || params.chosenIndex >= params.options.length) {
      throw createHttpError(400, 'Índice elegido inválido');
    }
    if (params.correctIndex < 0 || params.correctIndex >= params.options.length) {
      throw createHttpError(400, 'Índice correcto inválido');
    }
    if (!params.explanation?.trim()) throw createHttpError(400, 'La explicación es obligatoria');

    const claim = await AppDataSource.transaction(async (m) => {
      const qRepo = m.getRepository(Question);
      const rRepo = m.getRepository(TestResult);

      // 1) Si nos dan testResultId, comprobar propiedad (que sea del alumno)
      let testResult: TestResult | null = null;
      if (params.testResultId) {
        testResult = await rRepo.findOne({
          where: { id: params.testResultId },
          relations: { session: { user: true, diagram: true }, question: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!testResult || testResult.session.user.id !== params.studentId) {
          throw createHttpError(400, 'Resultado no válido para reclamar');
        }
        // evita duplicados de claim para el mismo resultado
        const dup = await m.getRepository(Claim).findOne({
          where: { testResult: { id: testResult.id } },
        });
        if (dup) return dup; // ya existía, devolvemos la existente
      }

      // 2) Resolver pregunta: por questionId -> por testResult.question -> por matching prompt/opciones
      let q: Question | null = null;

      if (params.questionId) {
        q = await qRepo.findOne({
          where: { id: params.questionId },
          relations: { diagram: true, options: true },
          lock: { mode: 'pessimistic_write' },
        });
      } else if (testResult?.question) {
        q = await qRepo.findOne({
          where: { id: testResult.question.id },
          relations: { diagram: true, options: true },
          lock: { mode: 'pessimistic_write' },
        });
      }

      if (!q) {
        const candidate = await qRepo.find({
          where: { diagram: { id: params.diagramId } },
          relations: { diagram: true, options: true },
        });
        const wantedPrompt = norm(params.prompt);
        const wantedOpts = params.options.map(norm);

        q = candidate.find(c => {
          const cPrompt = norm(c.prompt);
          const cOpts = (c.options ?? [])
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(o => norm(o.text));
          return cPrompt === wantedPrompt && arraysEqualText(cOpts, wantedOpts);
        }) || null;

        if (q) {
          q = await qRepo.findOne({
            where: { id: q.id },
            relations: { diagram: true, options: true },
            lock: { mode: 'pessimistic_write' },
          });
        }
      }

      // 3) Si hay pregunta, pasarla a PENDING mientras se revisa
      if (q) {
        q.status = ReviewStatus.PENDING;
        await m.save(q);
      }

      // 4) Crear claim (enlazando TestResult si lo tenemos)
      const c = m.create(Claim, {
        status: ClaimStatus.PENDING,
        question: q ?? null,
        diagram,
        student,
        testResult: testResult ?? null, // ⬅️ clave para enlazar con el resultado
        promptSnapshot: params.prompt.trim(),
        optionsSnapshot: params.options.map(s => s.trim()),
        chosenIndex: params.chosenIndex,
        correctIndexAtSubmission: params.correctIndex,
        explanation: params.explanation.trim(),
      });
      await m.save(c);

      return c;
    });

    await this.notifySupervisorsNewClaim(claim);
    return { id: claim.id, status: claim.status, testResultId: claim.testResult?.id ?? null };
  }

  // ================== Listados ==================
  /**
   * Recupera reclamaciones pendientes para los paneles de supervisión.
   *
   * @public
   * @returns Array resumido con contexto del estudiante y del diagrama.
   */
  async listPending() {
    const rows = await this.claimRepo.find({
      where: { status: ClaimStatus.PENDING },
      relations: { student: true, question: true, diagram: true, testResult: true },
      order: { createdAt: 'DESC' },
    });

    return rows.map(c => ({
      id: c.id,
      testResultId: c.testResult?.id ?? null,
      questionId: c.question?.id ?? null,
      prompt: c.promptSnapshot,
      options: c.optionsSnapshot,
      chosenIndex: c.chosenIndex,
      correctIndex: c.correctIndexAtSubmission,
      explanation: c.explanation,
      createdAt: c.createdAt,
      student: {
        id: c.student.id,
        email: c.student.email,
        name: c.student.name ?? '',
        lastName: c.student.lastName ?? '',
      },
      diagram: c.diagram
        ? { id: c.diagram.id, title: c.diagram.title, path: c.diagram.path ?? null }
        : null,
    }));
  }

  /**
   * Cuenta el número de reclamaciones pendientes para mostrar indicadores.
   *
   * @public
   * @returns Total de reclamaciones en estado pendiente.
   */
  async getPendingCount() {
    return this.claimRepo.count({ where: { status: ClaimStatus.PENDING } });
  }

  /**
   * Lista las reclamaciones asociadas a un alumno concreto.
   *
   * @public
   * @param studentId - Identificador del estudiante autenticado.
   * @returns Historial de reclamaciones del alumno.
   */
  async listMine(studentId: string) {
    const rows = await this.claimRepo.find({
      where: { student: { id: studentId } },
      relations: { diagram: true, testResult: true },
      order: { createdAt: 'DESC' },
    });

    return rows.map(c => ({
      id: c.id,
      status: c.status,
      testResultId: c.testResult?.id ?? null,
      createdAt: c.createdAt,
      reviewedAt: c.reviewedAt ?? null,
      reviewerComment: c.reviewerComment ?? null,
      prompt: c.promptSnapshot,
      options: c.optionsSnapshot,
      chosenIndex: c.chosenIndex,
      correctIndex: c.correctIndexAtSubmission,
      diagram: c.diagram
        ? { id: c.diagram.id, title: c.diagram.title, path: c.diagram.path ?? null }
        : null,
    }));
  }

  // ================== Decidir reclamación ==================
  /**
   * Registra la decisión de un supervisor sobre una reclamación pendiente.
   * Actualiza la pregunta, notifica al alumno y deja registro del revisor.
   *
   * @public
   * @param params - Datos de la resolución emitida por el supervisor.
   */
  async decideClaim(params: {
    claimId: string;
    reviewerId: string;
    decision: 'approve' | 'reject';
    comment?: string;
  }) {
    const reviewer = await this.userRepo.findOneByOrFail({ id: params.reviewerId });
    if (reviewer.role !== UserRole.SUPERVISOR) throw createHttpError(403, 'No autorizado');

    await AppDataSource.transaction(async (m) => {
      const claim = await m.getRepository(Claim).findOne({
        where: { id: params.claimId },
        relations: { question: true, student: true, diagram: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!claim) throw createHttpError(404, 'Reclamación no encontrada');
      if (claim.status !== ClaimStatus.PENDING) {
        throw createHttpError(409, 'La reclamación ya fue resuelta');
      }

      // Carga pregunta con opciones si existe (para recalcular índice por texto)
      const q = claim.question
        ? await m.getRepository(Question).findOne({
            where: { id: claim.question.id },
            relations: { options: true },
            lock: { mode: 'pessimistic_write' },
          })
        : null;

      claim.reviewer = reviewer;
      claim.reviewerComment = params.comment?.trim() || null;
      claim.reviewedAt = new Date();

      if (params.decision === 'approve') {
        claim.status = ClaimStatus.APPROVED;

        if (q) {
          const chosenText = (claim.optionsSnapshot ?? [])[claim.chosenIndex];
          let newIdx = claim.chosenIndex;

          if (chosenText && Array.isArray(q.options)) {
            const sorted = q.options.slice().sort((a, b) => a.orderIndex - b.orderIndex);
            const found = sorted.findIndex(o => norm(o.text) === norm(chosenText));
            if (found >= 0) newIdx = found;
          }

          q.correctOptionIndex = newIdx;
          q.status = ReviewStatus.APPROVED;
          await m.save(q);
        }
      } else {
        claim.status = ClaimStatus.REJECTED;
        if (q) {
          q.status = ReviewStatus.APPROVED; // sale de pending igualmente
          await m.save(q);
        }
      }

      await m.save(claim);

      // Email al alumno con la resolución
      const correctIndexNow =
        claim.status === ClaimStatus.APPROVED
          ? claim.chosenIndex
          : claim.correctIndexAtSubmission;

      await this.notifyStudentDecision({
        to: claim.student.email,
        status: claim.status,
        diagramTitle: claim.diagram?.title ?? 'Diagrama',
        prompt: claim.promptSnapshot,
        chosenIndex: claim.chosenIndex,
        correctIndexNow,
        options: claim.optionsSnapshot ?? [],
        reviewerComment: claim.reviewerComment || undefined,
      });
    });

    return {
      id: params.claimId,
      status: params.decision === 'approve' ? ClaimStatus.APPROVED : ClaimStatus.REJECTED,
    };
  }

  // ================== Emails ==================

  private async notifySupervisorsNewClaim(claim: Claim) {
    const fixed = env.SUPERVISOR_NOTIFY_EMAIL;
    let recipients: string[] = [];
    if (fixed) {
      recipients = [fixed];
    } else {
      const sups = await this.userRepo.find({ where: { role: UserRole.SUPERVISOR } });
      recipients = sups.map(s => s.email).filter(Boolean);
    }
    if (!recipients.length) return;

    const studentFullName =
      `${claim.student.name ?? ''} ${claim.student.lastName ?? ''}`.trim() || claim.student.email;
    const diagTitle = claim.diagram?.title ?? 'Diagrama';

    const chosenTxt = claim.optionsSnapshot?.[claim.chosenIndex] ?? '';
    const correctTxt = claim.optionsSnapshot?.[claim.correctIndexAtSubmission] ?? '';

    const body = `
      <div style="font-size:14px;line-height:1.6">
        <div style="margin-bottom:12px">
          <span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;font-size:12px;font-weight:600">
            Pendiente de revisión
          </span>
        </div>

        <table role="presentation" style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;width:120px;color:#6b7280;">Alumno</td>
              <td style="padding:6px 0;"><strong>${escapeHtml(studentFullName)}</strong> (${escapeHtml(claim.student.email)})</td></tr>
          <tr><td style="padding:6px 0;width:120px;color:#6b7280;">Diagrama</td>
              <td style="padding:6px 0;">${escapeHtml(diagTitle)}</td></tr>
          <tr><td style="padding:6px 0;width:120px;color:#6b7280;">Enviada</td>
              <td style="padding:6px 0;">${escapeHtml(new Date(claim.createdAt).toLocaleString())}</td></tr>
        </table>

        <div style="margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#F9FAFB">
          <div style="color:#6b7280;font-size:12px;margin-bottom:6px">Pregunta</div>
          <div>${escapeHtml(claim.promptSnapshot)}</div>
        </div>

        <div style="display:flex;gap:8px;margin:10px 0 16px;flex-wrap:wrap">
          <span style="display:inline-block;border:1px solid #D1D5DB;border-radius:10px;padding:6px 10px;background:#ffffff;">
            <strong>Resp. alumno</strong>:
            <span style="font-variant-numeric:tabular-nums">${letterFromIndex(claim.chosenIndex)}</span>
            ${chosenTxt ? `· ${escapeHtml(chosenTxt)}` : ''}
          </span>
          <span style="display:inline-block;border:1px solid #D1D5DB;border-radius:10px;padding:6px 10px;background:#ffffff;">
            <strong>Resp. oficial</strong>:
            <span style="font-variant-numeric:tabular-nums">${letterFromIndex(claim.correctIndexAtSubmission)}</span>
            ${correctTxt ? `· ${escapeHtml(correctTxt)}` : ''}
          </span>
        </div>

        <div>
          <div style="color:#6b7280;font-size:12px;margin-bottom:6px">Motivo del alumno</div>
          <div style="padding:12px;border:1px solid #FDE68A;background:#FFFBEB;border-radius:10px;">
            ${escapeHtml(claim.explanation)}
          </div>
        </div>
      </div>
    `;

    const html = renderCardEmail({
      title: 'Nueva reclamación pendiente',
      bodyHtml: body,
      accent: '#FEF3C7',
    });

    await transporter.sendMail({
      from: '"ERPlay Notificaciones" <no-reply@erplay.com>',
      to: recipients.join(','),
      subject: 'Nueva reclamación pendiente de revisión',
      html,
    });
  }

  private async notifyStudentDecision(args: {
    to: string;
    status: ClaimStatus;
    diagramTitle: string;
    prompt: string;
    chosenIndex: number;
    correctIndexNow: number;
    options: string[];
    reviewerComment?: string;
  }) {
    const approved = args.status === ClaimStatus.APPROVED;

    const chosenTxt = args.options?.[args.chosenIndex] ?? '';
    const correctTxt = args.options?.[args.correctIndexNow] ?? '';

    const statusBadge = approved
      ? `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#D1FAE5;color:#065F46;border:1px solid #A7F3D0;font-size:12px;font-weight:600;">Aprobada</span>`
      : `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;font-size:12px;font-weight:600;">Rechazada</span>`;

    const body = `
      <div style="font-size:14px;line-height:1.6">
        <div style="margin-bottom:12px">${statusBadge}</div>

        <table role="presentation" style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;width:120px;color:#6b7280;">Diagrama</td>
              <td style="padding:6px 0;">${escapeHtml(args.diagramTitle)}</td></tr>
        </table>

        <div style="margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#F9FAFB">
          <div style="color:#6b7280;font-size:12px;margin-bottom:6px">Pregunta</div>
          <div>${escapeHtml(args.prompt)}</div>
        </div>

        <div style="display:flex;gap:8px;margin:10px 0 16px;flex-wrap:wrap">
          <span style="display:inline-block;border:1px solid #D1D5DB;border-radius:10px;padding:6px 10px;background:#ffffff;">
            <strong>Tu respuesta</strong>:
            <span style="font-variant-numeric:tabular-nums">${letterFromIndex(args.chosenIndex)}</span>
            ${chosenTxt ? `· ${escapeHtml(chosenTxt)}` : ''}
          </span>
          <span style="display:inline-block;border:1px solid #D1D5DB;border-radius:10px;padding:6px 10px;background:#ffffff;">
            <strong>Respuesta oficial tras revisión</strong>:
            <span style="font-variant-numeric:tabular-nums">${letterFromIndex(args.correctIndexNow)}</span>
            ${correctTxt ? `· ${escapeHtml(correctTxt)}` : ''}
          </span>
        </div>

        ${
          args.reviewerComment
            ? `<div>
                 <div style="color:#6b7280;font-size:12px;margin-bottom:6px">Comentario del revisor</div>
                 <div style="padding:12px;border:1px solid #e5e7eb;background:#ffffff;border-radius:10px;">
                   ${escapeHtml(args.reviewerComment)}
                 </div>
               </div>`
            : ''
        }
      </div>
    `;

    const html = renderCardEmail({
      title: 'Resultado de tu reclamación',
      bodyHtml: body,
      accent: approved ? '#D1FAE5' : '#FEE2E2',
    });

    await transporter.sendMail({
      from: '"ERPlay Revisión" <no-reply@erplay.com>',
      to: args.to,
      subject: approved ? 'Tu reclamación ha sido aprobada' : 'Tu reclamación ha sido revisada',
      html,
    });
  }
}
