/**
 * Módulo de servicio de preguntas
 * Gestiona creación, revisión y notificaciones de preguntas propuestas
 * @module back/services/questions
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
import fs from 'fs/promises';
import path from 'path';

const transporter = defaultMailer;

const autoApproveFile = path.join(process.cwd(), 'back', 'uploads', 'auto-approve-questions.json');
let autoApproveCache: boolean | null = null;

async function loadAutoApproveFlag(): Promise<boolean> {
  if (autoApproveCache !== null) return autoApproveCache;
  try {
    const raw = await fs.readFile(autoApproveFile, 'utf-8');
    const parsed = JSON.parse(raw);
    autoApproveCache = Boolean(parsed?.autoApprove === true);
  } catch {
    autoApproveCache = true;
  }
  return autoApproveCache;
}

async function persistAutoApproveFlag(enabled: boolean) {
  autoApproveCache = enabled;
  await fs.mkdir(path.dirname(autoApproveFile), { recursive: true });
  await fs.writeFile(autoApproveFile, JSON.stringify({ autoApprove: enabled }), 'utf-8');
}

/** Parámetros de entrada para crear pregunta */
type CreateQuestionParams = {
  diagramId: string;
  prompt: string;
  hint: string;
  options: string[];
  correctIndex: number;
  creatorId: string;
};

/**
 * Servicio de preguntas
 * Orquesta el flujo completo de propuesta, revisión y notificaciones
 */
export class QuestionsService {
  private questionRepo = AppDataSource.getRepository(Question);
  private optionRepo = AppDataSource.getRepository(Option);
  private diagramRepo = AppDataSource.getRepository(Diagram);
  private userRepo = AppDataSource.getRepository(User);

  async isAutoApproveEnabled(): Promise<boolean> {
    return loadAutoApproveFlag();
  }

  async setAutoApprove(enabled: boolean): Promise<boolean> {
    await persistAutoApproveFlag(enabled);
    return enabled;
  }

  /**
   * Crea una nueva pregunta propuesta por estudiante o supervisor
   * Las preguntas de supervisores se aprueban automáticamente
   * 
   * @param params - Datos de la pregunta y creador
   * @returns ID y estado inicial de la pregunta
   * @throws {HttpError} 400 si faltan datos o son inválidos
   * @remarks
   * - Supervisores: status = APPROVED (sin revisión)
   * - Estudiantes: status = PENDING → notifica a supervisores por email
   */
  async createQuestion(params: CreateQuestionParams): Promise<{ id: string; status: ReviewStatus }> {
    const diagram = await this.diagramRepo.findOneByOrFail({ id: params.diagramId });
    const creator = await this.userRepo.findOneByOrFail({ id: params.creatorId });

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

    const autoMode = await this.isAutoApproveEnabled();
    const initialStatus =
      creator.role === UserRole.SUPERVISOR || autoMode ? ReviewStatus.APPROVED : ReviewStatus.PENDING;

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
    if (initialStatus === ReviewStatus.PENDING) {
      await this.notifySupervisorsNewPending(q.id);
    } else if (autoMode && creator.role !== UserRole.SUPERVISOR && creator.email) {
      await this.notifyStudentAutoApproved({ to: creator.email, prompt: q.prompt });
    }

    return { id: q.id, status: q.status };
  }

  /**
   * Obtiene contador de preguntas pendientes de revisión
   * @returns Número total de preguntas con status PENDING
   */
  async getPendingCount(): Promise<number> {
    return this.questionRepo.count({ where: { status: ReviewStatus.PENDING } });
  }

  /**
   * Lista preguntas pendientes de revisión con información completa
   * @returns Array de preguntas ordenadas por fecha descendente
   * @remarks
   * - Incluye datos del creador, diagrama y opciones ordenadas
   * - Solo retorna preguntas con status PENDING
   */
  async listPending(): Promise<
    Array<{
      id: string;
      prompt: string;
      hint: string;
      correctIndex: number;
      options: string[];
      createdAt: Date;
      creator?: { id: string; email: string; name?: string | null };
      diagram?: { id: string; title: string; path: string };
    }>
  > {
    const rows = await this.questionRepo.find({
      where: { status: ReviewStatus.PENDING },
      relations: { creator: true, diagram: true, options: true },
      order: { createdAt: 'DESC' },
    });

    return rows.map((q) => {
      const options = (q.options || [])
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((o) => o.text);

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
   * Revisa una pregunta pendiente (aprobar o rechazar)
   * Notifica al autor del resultado por email
   * 
   * @param params - ID de pregunta, revisor, decisión y comentario opcional
   * @throws {HttpError} 404 si la pregunta no existe
   * @remarks
   * - Aprobar: status → APPROVED, reviewComment → null
   * - Rechazar: status → REJECTED, reviewComment → motivo
   * - Actualiza reviewedBy y reviewedAt automáticamente
   * - Envía email al creador con resultado y detalles
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
    if (q.creator?.email) {
      await this.notifyStudentDecision({
        to: q.creator.email,
        prompt: q.prompt,
        status: q.status,
        comment: q.reviewComment || undefined,
      });
    }
  }

  /**
   * Lista preguntas creadas por un usuario específico
   * Incluye todas las preguntas (aprobadas, rechazadas, pendientes)
   * 
   * @param creatorId - ID del usuario creador
   * @returns Array de preguntas ordenadas por fecha descendente
   * @remarks
   * - Incluye comentario de revisión si fue rechazada
   * - Muestra opciones ordenadas y índice correcto
   */
  async listMine(
    creatorId: string
  ): Promise<
    Array<{
      id: string;
      prompt: string;
      status: ReviewStatus;
      reviewComment: string | null;
      createdAt: Date;
      reviewedAt: Date | null;
      diagram?: { id: string; title: string; path: string | null };
      options: string[];
      correctIndex: number;
    }>
  > {
    const rows = await this.questionRepo.find({
      where: { creator: { id: creatorId } },
      relations: { diagram: true, options: true },
      order: { createdAt: 'DESC' },
    });

    return rows.map((r) => {
      const opts = (r.options ?? [])
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((o) => o.text);

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
        options: opts,
        correctIndex: r.correctOptionIndex ?? 0,
      };
    });
  }

  /**
   * Notifica a supervisores sobre nueva pregunta pendiente
   * Email con diseño tipo "card" mostrando opciones y respuesta correcta
   * 
   * @param questionId - ID de la pregunta recién creada
   * @remarks
   * - Destinatarios: env.SUPERVISOR_NOTIFY_EMAIL o todos los supervisores
   * - Muestra opciones con borde verde para la respuesta correcta
   * - Incluye link directo al panel de revisión si FRONTEND_URL está configurado
   */
  private async notifySupervisorsNewPending(questionId: string) {
    const fixed = env.SUPERVISOR_NOTIFY_EMAIL;
    let recipients: string[] = [];
    if (fixed) {
      recipients = [fixed];
    } else {
      const sups = await this.userRepo.find({ where: { role: UserRole.SUPERVISOR } });
      recipients = sups.map((s) => s.email).filter(Boolean);
    }
    if (!recipients.length) return;

    const q = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: { diagram: true, creator: true, options: true },
    });
    if (!q) return;

    const diagramTitle = q.diagram?.title ?? 'Diagrama';
    const creatorName = (q.creator?.name ?? '').trim();
    const creatorLast = ((q.creator as any)?.lastName ?? '').trim();
    const creatorEmail = q.creator?.email ?? '';
    const fullName = [creatorName, creatorLast].filter(Boolean).join(' ') || 'Alumno';

    const frontURL = env.FRONTEND_URL ?? env.APP_URL ?? '';
    const reviewURL = frontURL ? `${frontURL.replace(/\/+$/, '')}/supervisor/questions/review` : '';

    const sortedOpts = (q.options ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const optsHtml = sortedOpts.length
      ? sortedOpts
          .map((o, idx) => {
            const correct = idx === (q.correctOptionIndex ?? -1);
            return `
            <div style="
              border:1px solid ${correct ? '#A7F3D0' : '#e5e7eb'};
              background:${correct ? '#ECFDF5' : '#ffffff'};
              border-radius:10px;padding:8px 10px;margin:6px 0;font-size:14px;">
              <strong style="margin-right:6px">${letterFromIndex(idx)}.</strong>
              <span>${escapeHtml(o.text)}</span>
              ${correct ? `<span style="color:#065F46;margin-left:8px;font-weight:600">✓ Correcta</span>` : ''}
            </div>
          `;
          })
          .join('')
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
      accent: '#FEF3C7', 
    });

    await transporter.sendMail({
      from: '"ERPlay Notificaciones" <no-reply@erplay.com>',
      to: recipients.join(','),
      subject: 'Nueva pregunta pendiente de revisión',
      html,
    });
  }

  /**
   * Notifica al estudiante el resultado de la revisión
   * Email diferenciado por color según aprobación/rechazo
   * 
   * @param args - Email destino, pregunta, estado y comentario opcional
   * @remarks
   * - Aprobada: Badge verde + mensaje de felicitación
   * - Rechazada: Badge rojo + motivo del rechazo (si existe)
   * - Incluye link a "Mis preguntas" si FRONTEND_URL está configurado
   */
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
            font-size:12px;font-weight:700;">✓ APROBADA</span>`
      : `<span style="
            display:inline-block;padding:4px 10px;border-radius:999px;
            background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;
            font-size:12px;font-weight:700;">✗ RECHAZADA</span>`;

    const ctaHtml = myQuestionsURL
      ? `
        <a href="${myQuestionsURL}"
           style="display:inline-block;padding:12px 18px;border-radius:10px;
                  background:#4f46e5;color:#fff;text-decoration:none;font-weight:600">
          Ver mis preguntas
        </a>`
      : '';

    const rejectBlock =
      !approved && args.comment?.trim()
        ? `
        <div style="margin-top:14px;">
          <div style="font-size:14px;color:#64748b;margin-bottom:6px;">Motivo del rechazo</div>
          <div style="padding:12px;border:1px solid #fecaca;border-radius:10px;background:#fff1f2;
                      color:#7f1d1d;font-size:14px;">
            ${escapeHtml(args.comment.trim())}
          </div>
        </div>`
        : !approved
        ? `<div style="margin-top:14px;color:#6b7280;font-size:13px;">
               Tu pregunta ha sido rechazada. Revisa el enunciado y las opciones antes de volver a enviarla.
             </div>`
        : '';

    const body = `
      <div style="font-size:14px;line-height:1.6">
        <div style="margin-bottom:12px">${statusBadge}</div>

        <div style="margin:8px 0 6px 0;font-size:12px;color:#6b7280;">Pregunta</div>
        <div style="padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#F9FAFB">
          ${escapeHtml(args.prompt)}
        </div>

        ${rejectBlock}

        ${ctaHtml ? `<div style="margin-top:18px;">${ctaHtml}</div>` : ''}

        ${
          approved
            ? `<p style="margin-top:14px;color:#16a34a;font-size:14px;">
               ¡Enhorabuena! Tu pregunta ya puede formar parte del banco de preguntas.
             </p>`
            : ''
        }
      </div>
    `;

    const html = renderCardEmail({
      title: 'Resultado de la revisión de tu pregunta',
      bodyHtml: body,
      accent: approved ? '#D1FAE5' : '#FEE2E2',  
    });

    await transporter.sendMail({
      from: '"ERPlay Revisión" <no-reply@erplay.com>',
      to: args.to,
      subject: approved ? 'Tu pregunta ha sido aprobada' : 'Tu pregunta ha sido revisada',
      html,
    });
  }

  private async notifyStudentAutoApproved(args: { to: string; prompt: string }) {
    const frontURL = (env.FRONTEND_URL ?? env.APP_URL ?? '').replace(/\/+$/, '');
    const myQuestionsURL = frontURL ? `${frontURL}/student/questions` : '';

    const body = `
      <div style="font-size:14px;line-height:1.6">
        <div style="margin-bottom:12px">
          <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#D1FAE5;color:#065F46;border:1px solid #A7F3D0;font-size:12px;font-weight:700;">✓ ACEPTADA</span>
        </div>

        <div style="margin:8px 0 6px 0;font-size:12px;color:#6b7280;">Pregunta</div>
        <div style="padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#F9FAFB">
          ${escapeHtml(args.prompt)}
        </div>

        ${
          myQuestionsURL
            ? `<div style="margin-top:18px;">
                <a href="${myQuestionsURL}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600">Ver mis preguntas</a>
              </div>`
            : ''
        }

        <p style="margin-top:14px;color:#16a34a;font-size:14px;">
          Tu pregunta ha sido añadida automáticamente a las preguntas del diagrama.
        </p>
      </div>
    `;

    const html = renderCardEmail({
      title: 'Tu pregunta está ha sido incluida',
      bodyHtml: body,
      accent: '#D1FAE5',
    });

    await transporter.sendMail({
      from: '"ERPlay Revisión" <no-reply@erplay.com>',
      to: args.to,
      subject: 'Tu pregunta ha sido incluida satisfactoriamente',
      html,
    });
  }
}