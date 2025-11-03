/**
 * @module services/weeklyGoal
 * Gestión de objetivos semanales y notificaciones a estudiantes.
 */

import { env } from '../config/env';
import { createMailer } from '../config/mailer';
import { createHttpError } from '../core/errors/HttpError';
import { AppDataSource } from '../data-source';
import { TestSession } from '../models/TestSession';
import { User, UserRole } from '../models/User';
import { WeeklyGoal } from '../models/WeeklyGoal';
import { escapeHtml, renderCardEmail } from './shared/emailTemplates';

/* ===================== Helpers de fecha ===================== */

/**
 * Calcula el lunes (00:00 UTC) de la semana ISO del día indicado.
 * @internal
 */
function startOfISOWeek(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7; // 1..7 (lunes..domingo)
  if (day > 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  return x; // lunes 00:00 UTC
}
/**
 * Calcula el domingo correspondiente a la semana ISO.
 * @internal
 */
function endOfISOWeek(d: Date) {
  const s = startOfISOWeek(d);
  const e = new Date(s);
  e.setUTCDate(e.getUTCDate() + 6);
  return e; // domingo (solo usamos YYYY-MM-DD)
}
/**
 * Normaliza una fecha a formato YYYY-MM-DD.
 * @internal
 */
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* ===================== Email (transporter + plantilla) ===================== */

const transporter = createMailer({
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,
});

/**
 * Envía la notificación del nuevo objetivo a todos los estudiantes.
 * @internal
 */
async function notifyAllStudentsNewGoal(args: { weekStart: string; weekEnd: string; targetTests: number }) {
  const students = await AppDataSource.getRepository(User).find({
    where: { role: UserRole.STUDENT },
  });

  const recipients = students.map((s) => s.email).filter(Boolean);
  if (!recipients.length) return;

  const frontBase = (env.FRONTEND_URL ?? env.APP_URL ?? '').replace(/\/+$/, '');
  const ctaUrl = frontBase ? `${frontBase}/student/progress` : '';

  const body = `
    <div style="font-size:14px;line-height:1.7">
      <div style="margin-bottom:12px">
        <span style="
          display:inline-block;padding:2px 10px;border-radius:999px;
          background:#DBEAFE;color:#1E3A8A;border:1px solid #BFDBFE;
          font-size:12px;font-weight:700;">OBJETIVO SEMANAL</span>
      </div>

      <p style="margin:0 0 10px 0;">
        Se ha establecido un nuevo <strong>objetivo semanal</strong>:
        <strong>completar ${escapeHtml(String(args.targetTests))} tests</strong>.
      </p>
      <p style="margin:0 0 10px 0;">
        Período: <strong>${escapeHtml(args.weekStart)}</strong> — <strong>${escapeHtml(args.weekEnd)}</strong>.
      </p>
      <p style="margin:0 0 16px 0;">¡Ánimo! Al cumplirlo recibirás el galardón de la semana.</p>

      ${ctaUrl ? `
        <a href="${ctaUrl}"
           style="display:inline-block;padding:12px 18px;border-radius:10px;
                  background:#4f46e5;color:#fff;text-decoration:none;font-weight:600">
          Ver mi progreso
        </a>` : ''}
    </div>
  `;

  const html = renderCardEmail({
    title: 'Nuevo objetivo semanal',
    bodyHtml: body,
    accent: '#DBEAFE',
  });

  await transporter.sendMail({
    from: env.SMTP_FROM || '"ERPlay" <no-reply@erplay.com>',
    to: env.SMTP_FROM || 'no-reply@erplay.com',
    bcc: recipients.join(','),                           // alumnos en BCC (privacidad)
    subject: 'Nuevo objetivo semanal',
    html,
  });
}

/* ===================== Servicios públicos ===================== */

/**
 * Recupera el objetivo semanal activo cuyo rango incluye la fecha actual.
 *
 * @public
 * @returns Objetivo vigente o `null` si no existe.
 */
export async function getCurrentWeeklyGoal() {
  const repo = AppDataSource.getRepository(WeeklyGoal);
  const today = toISODate(new Date());

  // Objetivo activo cuyo rango incluye hoy
  const current = await repo
    .createQueryBuilder('g')
    .where('g.weekStart <= :today', { today })
    .andWhere('g.weekEnd >= :today', { today })
    .orderBy('g.weekStart', 'DESC')
    .getOne();

  return current || null;
}

/**
 * Crea o actualiza el objetivo semanal y, opcionalmente, notifica a los alumnos.
 *
 * @public
 * @param params - Datos del objetivo y banderas de notificación.
 */
export async function setWeeklyGoal(params: {
  adminId: string;
  targetTests: number;
  weekStart?: string; // YYYY-MM-DD
  weekEnd?: string;   // YYYY-MM-DD
  notify?: boolean;   // por defecto true
}) {
  const { adminId, targetTests } = params;

  if (!Number.isFinite(targetTests) || targetTests <= 0) {
    throw createHttpError(400, 'El objetivo debe ser un número mayor que 0');
  }

  // valida admin
  await AppDataSource.getRepository(User).findOneByOrFail({ id: adminId });

  // rango de semana
  let s: string, e: string;
  if (params.weekStart && params.weekEnd) {
    s = params.weekStart;
    e = params.weekEnd;
  } else {
    const now = new Date();
    s = toISODate(startOfISOWeek(now));
    e = toISODate(endOfISOWeek(now));
  }

  const repo = AppDataSource.getRepository(WeeklyGoal);

  // si ya existe esa semana, actualiza; si no, crea
  let goal = await repo
    .createQueryBuilder('g')
    .where('g.weekStart = :s AND g.weekEnd = :e', { s, e })
    .getOne();

  if (goal) {
    goal.targetTests = Math.round(targetTests);
    await repo.save(goal);
  } else {
    goal = repo.create({
      weekStart: s,
      weekEnd: e,
      targetTests: Math.round(targetTests),
      // createdBy opcional (relación), puedes asignarla si cargas el admin:
      // createdBy: admin,
    });
    await repo.save(goal);
  }

  // notificar en segundo plano para no bloquear la respuesta
  if (params.notify !== false) {
    const payload = { weekStart: goal.weekStart, weekEnd: goal.weekEnd, targetTests: goal.targetTests };
    setImmediate(() => {
      notifyAllStudentsNewGoal(payload).catch((e) => console.error('Email error (weekly-goal):', e));
    });
  }

  return goal;
}

/**
 * Obtiene el progreso semanal de todos los estudiantes para un rango dado.
 *
 * @public
 * @param weekStart - Límite inferior en formato ISO.
 * @param weekEnd - Límite superior en formato ISO.
 */
export async function listWeeklyProgress(weekStart?: string, weekEnd?: string) {
  const repo = AppDataSource.getRepository(WeeklyGoal);
  let s = weekStart;
  let e = weekEnd;

  if (!s || !e) {
    const g = await getCurrentWeeklyGoal();
    if (!g) return [];
    s = g.weekStart;
    e = g.weekEnd;
  }

  const students = await AppDataSource.getRepository(User).find({
    where: { role: UserRole.STUDENT },
    order: { name: 'ASC', lastName: 'ASC' },
  });
  if (!students.length) return [];

  // sesiones completadas dentro de la semana por alumno
  const rows = await AppDataSource.getRepository(TestSession)
    .createQueryBuilder('s')
    .innerJoin('s.user', 'u')
    .where('s.completedAt IS NOT NULL')
    .andWhere('DATE(s.completedAt) >= :s', { s })
    .andWhere('DATE(s.completedAt) <= :e', { e })
    .select('u.id', 'userId')
    .addSelect('COUNT(*)', 'done')
    .groupBy('u.id')
    .getRawMany<{ userId: string; done: string }>();

  const doneByUser: Record<string, number> = {};
  for (const r of rows) doneByUser[r.userId] = Number(r.done || 0);

  // target de la semana
  const g = await repo
    .createQueryBuilder('g')
    .where('g.weekStart = :s AND g.weekEnd = :e', { s, e })
    .getOne();
  const target = g?.targetTests ?? 0;

  return students.map((u) => {
    const done = doneByUser[u.id] ?? 0;
    const pct = target ? Math.min(100, Math.round((100 * done) / target)) : 0;
    return {
      userId: u.id,
      name: `${u.name ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
      email: u.email,
      done,
      target,
      pct,
      completed: target > 0 && done >= target,
    };
  });
}
