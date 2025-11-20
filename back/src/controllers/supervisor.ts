/**
 * Módulo del controlador de supervisor
 * Gestiona las peticiones relacionadas con la supervisión de estudiantes y su progreso
 * @module back/controllers/supervisor
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { UsersService } from '../services/user';
import * as progressSvc from '../services/progress';
import { QuestionsService } from '../services/questions';
import { TestSessionsService } from '../services/testSession';
import { ClaimsService } from '../services/claims';
import { UserRole } from '../models/User';
import { getCurrentWeeklyGoal, setWeeklyGoal, listWeeklyProgress } from '../services/weeklyGoal';

/**
 * Tipo extendido de Request con autenticación
 */
type AuthedReq = Request & { user?: { id: string; role: UserRole } };

/**
 * Instancias de servicios necesarios
 */
const usersSvc = new UsersService();
const questionsSvc = new QuestionsService();
const sessionsSvc = new TestSessionsService();
const claimsSvc = new ClaimsService();

/**
 * Esquemas de validación para supervisor
 */
const PutSchema = z.object({
  targetTests: z.coerce.number().int().positive(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notify: z.boolean().optional(),
});

const IdParam = z.object({ studentId: z.string().uuid() });

const TrendsQ = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  bucket: z.enum(['day', 'week']).optional(),
});

const TestsQ = z.object({
  mode: z.enum(['learning', 'exam', 'errors']).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  q: z.string().optional(),
});

const LimitQ = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(5),
});

/**
 * Funciones auxiliares para URLs y normalización
 */
const serviceBaseUrl = (req: Request) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = req.get('host');
  const base = env.PUBLIC_API_BASE_URL ?? `${proto}://${host}`;
  return base.replace(/\/+$/, '');
};

const withBase = (req: Request, maybePath?: string | null) => {
  if (!maybePath) return maybePath ?? null;
  if (/^https?:\/\//i.test(maybePath)) return maybePath;
  return `${serviceBaseUrl(req)}${maybePath.startsWith('/') ? '' : '/'}${maybePath}`;
};

/**
 * Normaliza el estado de una reclamación o pregunta
 */
function normalizeStatus(s?: string | null) {
  const k = String(s ?? '').toLowerCase();
  if (k.includes('approve')) return 'approved';
  if (k.includes('reject')) return 'rejected';
  if (k.includes('pend')) return 'pending';
  return 'pending';
}

/**
 * Obtiene información detallada de un estudiante específico
 * @param req Objeto Request de Express con ID del estudiante
 * @param res Objeto Response de Express
 */
export async function getStudent(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const user = await usersSvc.getById(studentId);
    res.json(user);
  } catch (e: any) {
    res.status(404).json({ error: e?.message || 'Alumno no encontrado' });
  }
}

/**
 * Obtiene el resumen general del progreso de un estudiante
 * @param req Objeto Request de Express con ID del estudiante
 * @param res Objeto Response de Express
 */
export async function getOverview(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const data = await progressSvc.getOverview(studentId);
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

/**
 * Obtiene las tendencias de progreso de un estudiante en un período
 * @param req Objeto Request de Express con ID del estudiante y filtros de fecha
 * @param res Objeto Response de Express
 */
export async function getTrends(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const { from, to, bucket } = TrendsQ.parse(req.query);
    const items = await progressSvc.getTrends({ userId: studentId, from, to, bucket: bucket ?? 'day' });
    res.json(items);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

/**
 * Obtiene los errores más frecuentes de un estudiante
 * @param req Objeto Request de Express con ID del estudiante y límite de resultados
 * @param res Objeto Response de Express
 */
export async function getErrors(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const { limit } = LimitQ.parse(req.query);
    const items = await progressSvc.getErrors({ userId: studentId, limit, minAttempts: 3 });
    res.json(items);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

/**
 * Obtiene estadísticas de reclamaciones de un estudiante
 * @param req Objeto Request de Express con ID del estudiante
 * @param res Objeto Response de Express
 */
export async function getClaimsStats(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const data = await progressSvc.getClaimsStats(studentId);
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

/**
 * Lista todas las reclamaciones de un estudiante con detalles completos
 * @param req Objeto Request de Express con ID del estudiante
 * @param res Objeto Response de Express
 */
export async function listUserClaims(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const rows = await claimsSvc.listMine(studentId);

    const out = rows.map((c: any) => {
      const statusToken = normalizeStatus(c.status);

      const options = Array.isArray(c.options) ? c.options : Array.isArray(c.optionsSnapshot) ? c.optionsSnapshot : [];
      const chosenIndex =
        typeof c.chosenIndex === 'number' ? c.chosenIndex :
        typeof c.selectedIndex === 'number' ? c.selectedIndex :
        null;
      const correctIndexAtSubmission =
        typeof c.correctIndexAtSubmission === 'number' ? c.correctIndexAtSubmission :
        typeof c.correctIndex === 'number' ? c.correctIndex :
        null;

      return {
        id: c.id,
        status: statusToken,
        createdAt: c.createdAt,
        reviewedAt: c.reviewedAt ?? null,
        reviewerComment: c.reviewerComment ?? null,
        resolution: {
          decidedAt: c.reviewedAt ?? null,
          comment: c.reviewerComment ?? null,
        },
        promptSnapshot: c.prompt,
        prompt: c.prompt,
        optionsSnapshot: options,
        options,
        chosenIndex,
        correctIndexAtSubmission,
        correctIndex: correctIndexAtSubmission,
        diagram: c.diagram
          ? {
              id: c.diagram.id,
              title: c.diagram.title,
              path: withBase(req, c.diagram.path),
            }
          : null,
        question: c.prompt ? { prompt: c.prompt } : undefined,
      };
    });

    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudieron listar las reclamaciones' });
  }
}

/**
 * Lista todas las preguntas creadas por un estudiante
 * @param req Objeto Request de Express con ID del estudiante
 * @param res Objeto Response de Express
 */
export async function listCreatedQuestions(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));

    const rows = await questionsSvc.listMine(studentId);

    const out = rows.slice(0, limit).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      createdAt: q.createdAt,
      diagram: q.diagram
        ? {
            id: q.diagram.id,
            title: q.diagram.title,
            path: withBase(req, q.diagram.path),
          }
        : undefined,
      options: Array.isArray(q.options) ? q.options : [],
      correctIndex:
        typeof q.correctIndex === 'number'
          ? q.correctIndex
          : (q as any).correctOptionIndex ?? 0,
    }));

    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

/**
 * Lista las sesiones de test de un estudiante con filtros opcionales
 * @param req Objeto Request de Express con ID del estudiante y filtros
 * @param res Objeto Response de Express
 */
export async function listUserSessions(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const { mode, dateFrom, dateTo, q } = TestsQ.parse(req.query);
    const rows = await sessionsSvc.listMine({ userId: studentId, mode, dateFrom, dateTo, q });

    res.json(
      rows.map((s: any) => ({
        ...s,
        diagram: s.diagram ? { ...s.diagram, path: withBase(req, s.diagram.path) } : null,
      }))
    );
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudieron listar los tests' });
  }
}

/**
 * Obtiene el detalle completo de una sesión de test específica
 * @param req Objeto Request de Express con ID del estudiante e ID de sesión
 * @param res Objeto Response de Express
 */
export async function getUserSessionDetail(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const sessionId = z.string().uuid().parse(req.params.sessionId);
    const data = await sessionsSvc.getOne({ userId: studentId, sessionId });

    const diagram = data.diagram
      ? { ...data.diagram, path: withBase(req, data.diagram.path) }
      : null;

    res.json({ ...data, diagram });
  } catch (e: any) {
    res.status(404).json({ error: e?.message || 'Test no encontrado' });
  }
}

/**
 * Obtiene el objetivo semanal global actual
 * @param req Objeto Request de Express autenticado
 * @param res Objeto Response de Express
 */
export async function getWeeklyGoal(_req: AuthedReq, res: Response) {
  try {
    const g = await getCurrentWeeklyGoal();
    res.json(g ?? { weekStart: null, weekEnd: null, targetTests: 0 });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

/**
 * Establece un nuevo objetivo semanal global
 * @param req Objeto Request de Express autenticado con datos del objetivo
 * @param res Objeto Response de Express
 * @remarks Requiere `Role.SUPERVISOR`.
 */
export async function putWeeklyGoal(req: AuthedReq, res: Response) {
  try {
    if (!req.user?.id || req.user.role !== UserRole.SUPERVISOR) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    const input = PutSchema.parse(req.body);
    const g = await setWeeklyGoal({
      adminId: req.user.id,
      targetTests: input.targetTests,
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      notify: input.notify,
    });
    res.json(g);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudo guardar el objetivo' });
  }
}

/**
 * Obtiene el progreso semanal de todos los estudiantes o de uno específico
 * @param req Objeto Request de Express autenticado con filtros opcionales
 * @param res Objeto Response de Express
 */
export async function getWeeklyGoalProgress(req: AuthedReq, res: Response) {
  try {
    const weekStart = typeof req.query.weekStart === 'string' ? req.query.weekStart : undefined;
    const weekEnd = typeof req.query.weekEnd === 'string' ? req.query.weekEnd : undefined;
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;

    const rows = await listWeeklyProgress(weekStart, weekEnd);

    if (userId) {
      const one = rows.find(r => r.userId === userId);
      res.json(one ? [one] : []);
      return;
    }

    res.json(rows);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

/**
 * Obtiene las insignias conseguidas por un estudiante
 * @param req Objeto Request de Express con ID del estudiante
 * @param res Objeto Response de Express
 */
export async function getStudentBadges(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const items = await progressSvc.getBadges(studentId);
    res.json(Array.isArray(items) ? items : []);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudieron listar las insignias' });
  }
}