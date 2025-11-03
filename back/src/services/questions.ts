/**
 * @module services/questions
 * Orquesta la creación, revisión y notificaciones de preguntas.
 */
import { defaultMailer } from '../config/mailer';
import { env } from '../config/env';
import { createHttpError } from '../core/errors/HttpError';
import { AppDataSource } from '../data-source';
import { Diagram } from '../models/Diagram';
import { Option } from '../models/Option';
import { Question, ReviewStatus } from '../models/Question';
import { User, UserRole } from '../models/User';
import { escapeHtml, letterFromIndex, renderCardEmail } from './shared/emailTemplates';

const transporter = defaultMailer;

type CreateQuestionParams = {
  diagramId: string;
  prompt: string;
  hint: string;
  options: string[];
  correctIndex: number;
  creatorId: string;
};

/**
 * Reglas de negocio para gestionar preguntas propuestas por estudiantes.
 *
 * @public
 */
export class QuestionsService {
  private questionRepo = AppDataSource.getRepository(Question);
  private optionRepo = AppDataSource.getRepository(Option);
  private diagramRepo = AppDataSource.getRepository(Diagram);
  private userRepo = AppDataSource.getRepository(User);

  /**
   * Registra una nueva pregunta propuesta por un estudiante o supervisor.
   *
   * @public
   * @param params - Información mínima de la pregunta y su creador.
   * @returns Identificador y estado inicial.
   */
  async createQuestion(params: CreateQuestionParams): Promise<{ id: string; status: ReviewStatus }> {
    const diagram = await this.diagramRepo.findOneByOrFail({ id: params.diagramId });
    const creator = await this.userRepo.findOneByOrFail({ id: params.creatorId });

    // Validaciones simples
    if (!params.prompt?.trim()) throw createHttpError(400, 'El enunciado es obligatorio');
    if (!params.hint?.trim()) throw createHttpError(400, 'La pista es obligatoria');
    if (!Array.isArray(params.options) || params.options.length < 2) {
      throw createHttpError(400, 'Mínimo 2 opciones');
    }
    if (params.options.some((option) => !option || !option.trim())) {
      throw createHttpError(400, 'Las opciones no pueden estar vacías');
    }
    if (params.correctIndex < 0 || params.correctIndex >= params.options.length) {
      throw createHttpError(400, 'Índice correcto inválido');
    }

    const initialStatus =
      creator.role === UserRole.SUPERVISOR ? ReviewStatus.APPROVED : ReviewStatus.PENDING;

    const q = await AppDataSource.transaction(async (manager) => {
      const question = manager.create(Question, {
        prompt: params.prompt.trim(),
        hint: params.hint.trim(),
        correctOptionIndex: params.correctIndex,
        diagram,
        creator,
        status: initialStatus,
      });
      await manager.save(question);

      const opts = params.options.map((text, i) =>
        manager.create(Option, { text: text.trim(), orderIndex: i, question })
      );
      await manager.save(opts);

      return question;
    });

    // Notificar a supervisores si quedó pendiente (con estilo “card”)
    if (initialStatus === ReviewStatus.PENDING) {
      await this.notifySupervisorsNewPending(q.id);
    }

    return { id: q.id, status: q.status };
  }

  /**
   * Devuelve la cantidad de preguntas pendientes de revisión.
   *
   * @public
   */
  async getPendingCount(): Promise<number> {
    return this.questionRepo.count({ where: { status: ReviewStatus.PENDING } });
  }

  /**
   * Lista preguntas en espera de revisión para los supervisores.
   *
   * @public
   */
  async listPending(): Promise<Array<{
    id: string;
    prompt: string;
    hint: string;
    correctIndex: number;
    options: string[];
    createdAt: Date;
    creator?: { id: string; email: string; name?: string | null };
    diagram?: { id: string; title: string; path: string };
  }>> {
    const rows = await this.questionRepo.find({
      where: { status: ReviewStatus.PENDING },
      relations: { creator: true, diagram: true, options: true },
      order: { createdAt: 'DESC' },
    });

    return rows.map(q => {
      const options = (q.options || [])
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(o => o.text);

      return {
        id: q.id,
        prompt: q.prompt,
        hint: q.hint || '',
        correctIndex: q.correctOptionIndex ?? 0,
        options,
        createdAt: q.createdAt,
        creator: q.creator
          ? { id: q.creator.id, email: q.creator.email, name: q.creator.name ?? undefined }
          : undefined,
        diagram: q.diagram
          ? { id: q.diagram.id, title: q.diagram.title, path: q.diagram.path }
          : undefined,
      };
    });
  }

  /**
   * Aprueba o rechaza una pregunta según la decisión del supervisor.
   *
   * @public
   * @param params - Identificador de la pregunta y decisión tomada.
   */
  async verifyQuestion(params: {
    questionId: string;
    reviewerId: string;
    decision: 'approve' | 'reject';
    comment?: string;
  }): Promise<void> {
    const q = await this.questionRepo.findOne({
      where: { id: params.questionId },
      relations: { creator: true, diagram: true, options: true },
    });
    if (!q) throw createHttpError(404, 'Pregunta no encontrada');

    const reviewer = await this.userRepo.findOneByOrFail({ id: params.reviewerId });

    if (params.decision === 'approve') {
      q.status = ReviewStatus.APPROVED;
      q.reviewComment = null;
    } else {
      q.status = ReviewStatus.REJECTED;
      q.reviewComment = params.comment?.trim() || null;
    }
    q.reviewedBy = reviewer;
    q.reviewedAt = new Date();

    await this.questionRepo.save(q);

    // Notificar al autor (si existe) con estilo “card”
    if (q.creator?.email) {
      await this.notifyStudentDecision({
        to: q.creator.email,
        prompt: q.prompt,
        status: q.status,
        comment: q.reviewComment || undefined,
      });
    }
  }

  /** Email a supervisores: nueva pregunta pendiente (con opciones y correcta) */
  private async notifySupervisorsNewPending(questionId: string) {
    // Destinatarios
    const fixed = env.SUPERVISOR_NOTIFY_EMAIL;
    let recipients: string[] = [];
    if (fixed) {
      recipients = [fixed];
    } else {
      const sups = await this.userRepo.find({ where: { role: UserRole.SUPERVISOR } });
      recipients = sups.map(s => s.email).filter(Boolean);
    }
    if (!recipients.length) return;

    // Recarga con relaciones necesarias
    const q = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: { diagram: true, creator: true, options: true },
    });
    if (!q) return;

    const diagramTitle = q.diagram?.title ?? 'Diagrama';
    const creatorName  = (q.creator?.name ?? '').trim();
    const creatorLast  = ((q.creator as any)?.lastName ?? '').trim();
    const creatorEmail = q.creator?.email ?? '';
    const fullName     = [creatorName, creatorLast].filter(Boolean).join(' ') || 'Alumno';

    const frontURL = env.FRONTEND_URL ?? env.APP_URL ?? '';
    const reviewURL = frontURL ? `${frontURL.replace(/\/+$/,'')}/supervisor/questions/review` : '';

    const sortedOpts = (q.options ?? []).slice().sort((a,b)=>a.orderIndex-b.orderIndex);
    const optsHtml = sortedOpts.length
      ? sortedOpts.map((o, idx) => {
          const correct = idx === (q.correctOptionIndex ?? -1);
          return `
            <div style="
              border:1px solid ${correct ? '#A7F3D0' : '#e5e7eb'};
              background:${correct ? '#ECFDF5' : '#ffffff'};
              border-radius:10px;padding:8px 10px;margin:6px 0;font-size:14px;">
              <strong style="margin-right:6px">${letterFromIndex(idx)}.</strong>
              <span>${escapeHtml(o.text)}</span>
              ${correct ? `<span style="color:#065F46;margin-left:8px;font-weight:600">Correcta</span>` : ''}
            </div>
          `;
        }).join('')
      : `<div style="font-size:14px;color:#6b7280;">(sin opciones)</div>`;

    const btnHtml = reviewURL
      ? `
        <a href="${reviewURL}"
           style="display:inline-block;padding:12px 18px;border-radius:10px;
                  background:#4f46e5;color:#fff;text-decoration:none;font-weight:600">
          Revisar ahora
        </a>`
      : `
        <div style="color:#475569;font-size:14px;">
          Accede al panel de supervisor para revisarla.
        </div>`;

    const body = `
      <div style="font-size:14px;line-height:1.6">
        <div style="margin-bottom:12px">
          <span style="
            display:inline-block;padding:2px 10px;border-radius:999px;
            background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;
            font-size:12px;font-weight:600
          ">Pendiente de revisión</span>
        </div>

        <table role="presentation" style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;width:120px;color:#6b7280;">Diagrama</td>
            <td style="padding:6px 0;"><strong>${escapeHtml(diagramTitle)}</strong></td>
          </tr>
          <tr>
            <td style="padding:6px 0;width:120px;color:#6b7280;">Autor</td>
            <td style="padding:6px 0;">
              ${escapeHtml(fullName)}
              ${creatorEmail ? `&nbsp;&middot;&nbsp;<a href="mailto:${creatorEmail}" style="color:#4f46e5;text-decoration:none">${creatorEmail}</a>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;width:120px;color:#6b7280;">Enviada</td>
            <td style="padding:6px 0;">${escapeHtml(new Date(q.createdAt).toLocaleString())}</td>
          </tr>
        </table>

        <div style="margin:14px 0 8px 0;color:#6b7280;font-size:12px;">Pregunta</div>
        <div style="padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#F9FAFB">
          ${escapeHtml(q.prompt)}
        </div>

        <div style="margin:14px 0 8px 0;color:#6b7280;font-size:12px;">Opciones</div>
        ${optsHtml}

        <div style="margin-top:16px">${btnHtml}</div>
      </div>
    `;

    const html = renderCardEmail({
      title: 'Nueva pregunta pendiente de revisión',
      bodyHtml: body,
      accent: '#FEF3C7', // ámbar (pendiente)
    });

    await transporter.sendMail({
      from: '"ERPlay Notificaciones" <no-reply@erplay.com>',
      to: recipients.join(','),
      subject: 'Nueva pregunta pendiente de revisión',
      html,
    });
  }

  /** Email al alumno: resultado de revisión (aprobada / rechazada) */
  private async notifyStudentDecision(args: {
    to: string;
    prompt: string;
    status: ReviewStatus;
    comment?: string;
  }) {
    const approved = args.status === ReviewStatus.APPROVED;

    const frontURL = (env.FRONTEND_URL ?? env.APP_URL ?? '').replace(/\/+$/, '');
    const myQuestionsURL = frontURL ? `${frontURL}/student/questions` : '';

    const statusBadge = approved
      ? `<span style="
            display:inline-block;padding:4px 10px;border-radius:999px;
            background:#D1FAE5;color:#065F46;border:1px solid #A7F3D0;
            font-size:12px;font-weight:700;">APROBADA</span>`
      : `<span style="
            display:inline-block;padding:4px 10px;border-radius:999px;
            background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;
            font-size:12px;font-weight:700;">RECHAZADA</span>`;

    const ctaHtml = myQuestionsURL
      ? `
        <a href="${myQuestionsURL}"
           style="display:inline-block;padding:12px 18px;border-radius:10px;
                  background:#4f46e5;color:#fff;text-decoration:none;font-weight:600">
          Ver mis preguntas
        </a>`
      : '';

    const rejectBlock = !approved && args.comment?.trim()
      ? `
        <div style="margin-top:14px;">
          <div style="font-size:14px;color:#64748b;margin-bottom:6px;">Motivo del rechazo</div>
          <div style="padding:12px;border:1px solid #fecaca;border-radius:10px;background:#fff1f2;
                      color:#7f1d1d;font-size:14px;">
            ${escapeHtml(args.comment.trim())}
          </div>
        </div>`
      : (!approved
          ? `<div style="margin-top:14px;color:#6b7280;font-size:13px;">
               Tu pregunta ha sido rechazada. Revisa el enunciado y las opciones antes de volver a enviarla.
             </div>`
          : '');

    const body = `
      <div style="font-size:14px;line-height:1.6">
        <div style="margin-bottom:12px">${statusBadge}</div>

        <div style="margin:8px 0 6px 0;font-size:12px;color:#6b7280;">Pregunta</div>
        <div style="padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#F9FAFB">
          ${escapeHtml(args.prompt)}
        </div>

        ${rejectBlock}

        ${ctaHtml ? `<div style="margin-top:18px;">${ctaHtml}</div>` : ''}

        ${approved
          ? `<p style="margin-top:14px;color:#16a34a;font-size:14px;">
               ¡Enhorabuena! Tu pregunta ya puede formar parte del banco de preguntas.
             </p>`
          : ''}
      </div>
    `;

    const html = renderCardEmail({
      title: 'Resultado de la revisión de tu pregunta',
      bodyHtml: body,
      accent: approved ? '#D1FAE5' : '#FEE2E2', // verde/rojo claro
    });

    await transporter.sendMail({
      from: '"ERPlay Revisión" <no-reply@erplay.com>',
      to: args.to,
      subject: approved ? 'Tu pregunta ha sido aprobada' : 'Tu pregunta ha sido revisada',
      html,
    });
  }

  // =========================================================

  /**
   * Muestra al autor el histórico de sus preguntas con detalle.
   *
   * @public
   * @param creatorId - Identificador del usuario creador.
   */
  async listMine(creatorId: string): Promise<Array<{
    id: string;
    prompt: string;
    status: any;
    reviewComment: string | null;
    createdAt: Date;
    reviewedAt: Date | null;
    diagram?: { id: string; title: string; path: string | null };
    options: string[];           // ⬅️ nuevo
    correctIndex: number;        // ⬅️ nuevo
  }>> {
    const rows = await this.questionRepo.find({
      where: { creator: { id: creatorId } },
      relations: { diagram: true, options: true }, // ⬅️ añade options
      order: { createdAt: 'DESC' },
    });
  
    return rows.map(r => {
      const opts = (r.options ?? [])
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(o => o.text);
  
      return {
        id: r.id,
        prompt: r.prompt,
        status: r.status,
        reviewComment: r.reviewComment ?? null,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt ?? null,
        diagram: r.diagram
          ? { id: r.diagram.id, title: r.diagram.title, path: r.diagram.path ?? null }
          : undefined,
        options: opts,                                  // ⬅️ nuevo
        correctIndex: r.correctOptionIndex ?? 0,        // ⬅️ nuevo
      };
    });
  }
  
}
