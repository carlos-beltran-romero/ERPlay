import { AppDataSource } from '../data-source';
import { WeeklyGoal } from '../models/WeeklyGoal';
import { TestSession } from '../models/TestSession';
import { User, UserRole } from '../models/User';
import nodemailer from 'nodemailer';

/* ===================== Helpers de fecha ===================== */

function startOfISOWeek(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7; // 1..7 (lunes..domingo)
  if (day > 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  return x; // lunes 00:00 UTC
}
function endOfISOWeek(d: Date) {
  const s = startOfISOWeek(d);
  const e = new Date(s);
  e.setUTCDate(e.getUTCDate() + 6);
  return e; // domingo (solo usamos YYYY-MM-DD)
}
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* ===================== Email (transporter + plantilla) ===================== */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  // Pool para no bloquear la respuesta HTTP mientras se envían correos
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

function renderEmail(opts: { title: string; bodyHtml: string; accent?: string; footerHtml?: string }) {
  const accent = opts.accent ?? '#DBEAFE';
  const year = new Date().getFullYear();
  return `
    <div style="background:#f5f7fb;padding:24px 16px;">
      <div style="
        max-width:680px;margin:0 auto;background:#ffffff;
        border:1px solid #e5e7eb;border-radius:12px;
        box-shadow:0 2px 10px rgba(17,24,39,0.06);
        overflow:hidden;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
        color:#111827;">
        <div style="padding:14px 20px;background:${accent};border-bottom:1px solid #e5e7eb;">
          <h2 style="margin:0;font-size:18px;line-height:1.3;color:#111827">${opts.title}</h2>
        </div>
        <div style="padding:20px">
          ${opts.bodyHtml}
        </div>
        <div style="padding:12px 20px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:12px;">
          ${opts.footerHtml ?? `&copy; ${year} ERPlay`}
        </div>
      </div>
    </div>
  `;
}
function esc(s: string) {
  return (s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function notifyAllStudentsNewGoal(args: { weekStart: string; weekEnd: string; targetTests: number }) {
  const students = await AppDataSource.getRepository(User).find({
    where: { role: UserRole.STUDENT },
  });

  const recipients = students.map((s) => s.email).filter(Boolean);
  if (!recipients.length) return;

  const frontBase = (process.env.FRONTEND_URL || process.env.APP_URL || '').replace(/\/+$/, '');
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
        <strong>completar ${esc(String(args.targetTests))} tests</strong>.
      </p>
      <p style="margin:0 0 10px 0;">
        Período: <strong>${esc(args.weekStart)}</strong> — <strong>${esc(args.weekEnd)}</strong>.
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

  const html = renderEmail({
    title: 'Nuevo objetivo semanal',
    bodyHtml: body,
    accent: '#DBEAFE',
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"ERPlay" <no-reply@erplay.com>',
    to: process.env.SMTP_FROM || 'no-reply@erplay.com', // destinatario genérico
    bcc: recipients.join(','),                           // alumnos en BCC (privacidad)
    subject: 'Nuevo objetivo semanal',
    html,
  });
}

/* ===================== Servicios públicos ===================== */

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

export async function setWeeklyGoal(params: {
  adminId: string;
  targetTests: number;
  weekStart?: string; // YYYY-MM-DD
  weekEnd?: string;   // YYYY-MM-DD
  notify?: boolean;   // por defecto true
}) {
  const { adminId, targetTests } = params;

  if (!Number.isFinite(targetTests) || targetTests <= 0) {
    throw new Error('El objetivo debe ser un número mayor que 0');
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
