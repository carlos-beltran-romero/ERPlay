/**
 * Módulo de servicio de objetivos semanales
 * Gestiona la creación, consulta y notificación de metas de tests por semana
 * @module services/weeklyGoal
 */

import { env } from "../config/env";
import { createMailer } from "../config/mailer";
import { createHttpError } from "../core/errors/HttpError";
import { AppDataSource } from "../data-source";
import { TestSession } from "../models/TestSession";
import { User, UserRole } from "../models/User";
import { WeeklyGoal } from "../models/WeeklyGoal";
import { escapeHtml, renderCardEmail } from "./shared/emailTemplates";

/**
 * Calcula el lunes (00:00 UTC) de la semana ISO del día indicado
 * @param d - Fecha de referencia
 * @returns Lunes de la semana ISO en UTC
 * @remarks
 * - Usa convención ISO 8601: semana comienza el lunes
 * - getUTCDay() devuelve 0 (domingo) o 1..6, se normaliza a 1..7
 */
function startOfISOWeek(d: Date) {
  const x = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const day = x.getUTCDay() || 7;
  if (day > 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  return x;
}

/**
 * Calcula el domingo correspondiente a la semana ISO
 * @param d - Fecha de referencia
 * @returns Domingo de la semana ISO (lunes + 6 días)
 */
function endOfISOWeek(d: Date) {
  const s = startOfISOWeek(d);
  const e = new Date(s);
  e.setUTCDate(e.getUTCDate() + 6);
  return e;
}

/**
 * Normaliza una fecha a formato YYYY-MM-DD
 * @param d - Fecha a normalizar
 * @returns String en formato ISO date
 */
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const transporter = createMailer({
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,
});

/**
 * Envía notificación de nuevo objetivo a todos los estudiantes
 * @param args - Datos del objetivo semanal
 * @remarks
 * - Destinatarios en BCC para preservar privacidad
 * - Ejecuta en segundo plano vía setImmediate
 * - Email incluye CTA a /student/progress si FRONTEND_URL está configurado
 */
async function notifyAllStudentsNewGoal(args: {
  weekStart: string;
  weekEnd: string;
  targetTests: number;
}) {
  const students = await AppDataSource.getRepository(User).find({
    where: { role: UserRole.STUDENT },
  });

  const recipients = students.map((s) => s.email).filter(Boolean);
  if (!recipients.length) return;

  const frontBase = (env.FRONTEND_URL ?? env.APP_URL ?? "").replace(/\/+$/, "");
  const ctaUrl = frontBase ? `${frontBase}/student/progress` : "";

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
        <strong>completar ${escapeHtml(
          String(args.targetTests)
        )} tests</strong>.
      </p>
      <p style="margin:0 0 10px 0;">
        Período: <strong>${escapeHtml(
          args.weekStart
        )}</strong> — <strong>${escapeHtml(args.weekEnd)}</strong>.
      </p>
      <p style="margin:0 0 16px 0;">¡Ánimo! Al cumplirlo recibirás el galardón de la semana.</p>

      ${
        ctaUrl
          ? `
        <a href="${ctaUrl}"
           style="display:inline-block;padding:12px 18px;border-radius:10px;
                  background:#4f46e5;color:#fff;text-decoration:none;font-weight:600">
          Ver mi progreso
        </a>`
          : ""
      }
    </div>
  `;

  const html = renderCardEmail({
    title: "Nuevo objetivo semanal",
    bodyHtml: body,
    accent: "#DBEAFE",
  });

  await transporter.sendMail({
    from: env.SMTP_FROM || '"ERPlay" <no-reply@erplay.com>',
    to: env.SMTP_FROM || "no-reply@erplay.com",
    bcc: recipients.join(","),
    subject: "Nuevo objetivo semanal",
    html,
  });
}

/**
 * Recupera el objetivo semanal activo
 * Busca objetivo cuyo rango incluye la fecha actual
 *
 * @returns Objetivo vigente o null si no existe
 * @remarks
 * - Compara weekStart <= hoy <= weekEnd
 * - Si hay múltiples coincidencias, toma el más reciente
 */
export async function getCurrentWeeklyGoal() {
  const repo = AppDataSource.getRepository(WeeklyGoal);
  const today = toISODate(new Date());

  const current = await repo
    .createQueryBuilder("g")
    .where("g.weekStart <= :today", { today })
    .andWhere("g.weekEnd >= :today", { today })
    .orderBy("g.weekStart", "DESC")
    .getOne();

  return current || null;
}

/**
 * Crea o actualiza el objetivo semanal
 * Opcionalmente notifica a todos los estudiantes por email
 *
 * @param params - Configuración del objetivo y opciones de notificación
 * @returns Objetivo creado/actualizado
 * @throws {HttpError} 400 si targetTests no es válido
 * @remarks
 * - Si weekStart/weekEnd no se especifican, usa la semana ISO actual
 * - Si ya existe objetivo para esa semana, actualiza targetTests
 * - notify=true (default): envía emails en background
 * - Email se ejecuta con setImmediate para no bloquear respuesta HTTP
 */
export async function setWeeklyGoal(params: {
  adminId: string;
  targetTests: number;
  weekStart?: string;
  weekEnd?: string;
  notify?: boolean;
}) {
  const { adminId, targetTests } = params;

  if (!Number.isFinite(targetTests) || targetTests <= 0) {
    throw createHttpError(400, "El objetivo debe ser un número mayor que 0");
  }

  await AppDataSource.getRepository(User).findOneByOrFail({ id: adminId });

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

  let goal = await repo
    .createQueryBuilder("g")
    .where("g.weekStart = :s AND g.weekEnd = :e", { s, e })
    .getOne();

  if (goal) {
    goal.targetTests = Math.round(targetTests);
    await repo.save(goal);
  } else {
    goal = repo.create({
      weekStart: s,
      weekEnd: e,
      targetTests: Math.round(targetTests),
    });
    await repo.save(goal);
  }

  if (params.notify !== false) {
    const payload = {
      weekStart: goal.weekStart,
      weekEnd: goal.weekEnd,
      targetTests: goal.targetTests,
    };
    setImmediate(() => {
      notifyAllStudentsNewGoal(payload).catch((e) =>
        console.error("Email error (weekly-goal):", e)
      );
    });
  }

  return goal;
}

/**
 * Obtiene el progreso semanal de todos los estudiantes
 * Calcula tests completados vs objetivo para un rango dado
 *
 * @param weekStart - Fecha inicio (YYYY-MM-DD), opcional
 * @param weekEnd - Fecha fin (YYYY-MM-DD), opcional
 * @returns Array de progreso por estudiante ordenado alfabéticamente
 * @remarks
 * - Si no se especifica rango, usa el objetivo actual (getCurrentWeeklyGoal)
 * - done: Cuenta sesiones con completedAt dentro del rango
 * - pct: Porcentaje de completitud, máximo 100
 * - completed: true si done >= target
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
    order: { name: "ASC", lastName: "ASC" },
  });
  if (!students.length) return [];

  const rows = await AppDataSource.getRepository(TestSession)
    .createQueryBuilder("s")
    .innerJoin("s.user", "u")
    .where("s.completedAt IS NOT NULL")
    .andWhere("DATE(s.completedAt) >= :s", { s })
    .andWhere("DATE(s.completedAt) <= :e", { e })
    .select("u.id", "userId")
    .addSelect("COUNT(*)", "done")
    .groupBy("u.id")
    .getRawMany<{ userId: string; done: string }>();

  const doneByUser: Record<string, number> = {};
  for (const r of rows) doneByUser[r.userId] = Number(r.done || 0);

  const g = await repo
    .createQueryBuilder("g")
    .where("g.weekStart = :s AND g.weekEnd = :e", { s, e })
    .getOne();
  const target = g?.targetTests ?? 0;

  return students.map((u) => {
    const done = doneByUser[u.id] ?? 0;
    const pct = target ? Math.min(100, Math.round((100 * done) / target)) : 0;
    return {
      userId: u.id,
      name: `${u.name ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
      email: u.email,
      done,
      target,
      pct,
      completed: target > 0 && done >= target,
    };
  });
}
