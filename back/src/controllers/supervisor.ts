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



type AuthedReq = Request & { user?: { id: string; role: UserRole } };


const usersSvc = new UsersService();
const questionsSvc = new QuestionsService();
const sessionsSvc = new TestSessionsService();
const claimsSvc = new ClaimsService();

const PutSchema = z.object({
  targetTests: z.coerce.number().int().positive(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notify: z.boolean().optional(), // por defecto lo trataremos como true si no viene
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

// Normaliza cualquier variante a token minúscula
function normalizeStatus(s?: string | null) {
  const k = String(s ?? '').toLowerCase();
  if (k.includes('approve')) return 'approved';
  if (k.includes('reject')) return 'rejected';
  if (k.includes('pend')) return 'pending';
  return 'pending';
}

/** GET /api/supervisor/students/:studentId */
export async function getStudent(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const user = await usersSvc.getById(studentId);
    res.json(user);
  } catch (e: any) {
    res.status(404).json({ error: e?.message || 'Alumno no encontrado' });
  }
}

/** === PROGRESO === */

export async function getOverview(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const data = await progressSvc.getOverview(studentId);
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

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

/** ✅ Misma forma que /api/progress/errors del alumno */
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

/** === RECLAMACIONES === */

export async function getClaimsStats(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const data = await progressSvc.getClaimsStats(studentId);
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

export async function listUserClaims(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const rows = await claimsSvc.listMine(studentId);

    const out = rows.map((c: any) => {
      const statusToken = normalizeStatus(c.status);

      // Normalizaciones/alias como en alumno:
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
        status: statusToken,                 // 'pending' | 'approved' | 'rejected'
        createdAt: c.createdAt,
        reviewedAt: c.reviewedAt ?? null,

        // ====== NUEVO: resolución/comentario ======
        reviewerComment: c.reviewerComment ?? null,
        resolution: {
          decidedAt: c.reviewedAt ?? null,
          comment: c.reviewerComment ?? null,
        },

        // ====== NUEVO: datos para comparar respuestas (como alumno) ======
        promptSnapshot: c.prompt,           // igual que alumno
        prompt: c.prompt,
        optionsSnapshot: options,
        options,

        chosenIndex,                        // número o null
        correctIndexAtSubmission,           // número o null
        correctIndex: correctIndexAtSubmission,

        diagram: c.diagram
          ? {
              id: c.diagram.id,
              title: c.diagram.title,
              path: withBase(req, c.diagram.path),
            }
          : null,

        // mantenemos question por compat
        question: c.prompt ? { prompt: c.prompt } : undefined,
      };
    });

    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudieron listar las reclamaciones' });
  }
}




/** === PREGUNTAS CREADAS === */

// GET /api/supervisor/students/:studentId/questions
export async function listCreatedQuestions(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));

    // ⬇️ reutiliza tu servicio (ya normaliza options/correctIndex)
    const rows = await questionsSvc.listMine(studentId);

    const out = rows.slice(0, limit).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      status: q.status, // el front ya lo normaliza con normalizeReviewStatus
      reviewComment: q.reviewComment ?? null,
      createdAt: q.createdAt,
      reviewedAt: q.reviewedAt ?? null,
      diagram: q.diagram
        ? {
            id: q.diagram.id,
            title: q.diagram.title,
            path: withBase(req, q.diagram.path),
          }
        : undefined,

      // 👇 Igual que en el alumno:
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


/** === TESTS === */

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

/** GET /api/supervisor/students/:studentId/tests/:sessionId (detalle con “resolución”) */
export async function getUserSessionDetail(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    const sessionId = z.string().uuid().parse(req.params.sessionId);
    const data = await sessionsSvc.getOne({ userId: studentId, sessionId });

    // No tocamos el shape (el front alumno ya sabe pintarlo),
    // solo aseguramos ruta absoluta del diagrama para zoom:
    const diagram = data.diagram
      ? { ...data.diagram, path: withBase(req, data.diagram.path) }
      : null;

    res.json({ ...data, diagram });
  } catch (e: any) {
    res.status(404).json({ error: e?.message || 'Test no encontrado' });
  }
}

export async function getWeeklyGoal(_req: AuthedReq, res: Response) {
  try {
    const g = await getCurrentWeeklyGoal();
    res.json(g ?? { weekStart: null, weekEnd: null, targetTests: 0 });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

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

/** === INSIGNIAS DEL ALUMNO === */
/** GET /api/supervisor/students/:studentId/badges */
export async function getStudentBadges(req: Request, res: Response) {
  try {
    const { studentId } = IdParam.parse(req.params);
    // Reutilizamos el servicio de progreso del alumno
    const items = await progressSvc.getBadges(studentId);
    // items suele traer: [{ id, label, weekStart?, weekEnd?, earnedAt? }, ...]
    res.json(Array.isArray(items) ? items : []);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudieron listar las insignias' });
  }
}




