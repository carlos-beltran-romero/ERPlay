// back/src/controllers/progress.controller.ts
import { z } from 'zod';
import * as svc from '../services/progress';
import { Request, Response } from 'express';
import { listWeeklyProgress } from '../services/weeklyGoal';
import { getWeeklyProgressRow } from '../services/progress'; // importa esta ya la tienes hecha



type AuthedReq = Request & { user?: { id: string } };

const TrendsQ = z.object({
  from: z.string().date().optional(), // YYYY-MM-DD
  to: z.string().date().optional(),
  bucket: z.enum(['day','week']).optional()
});

export async function getOverview(req: Request, res: Response) {
  const userId = req.user!.id;
  const data = await svc.getOverview(userId);
  res.json(data);
}

export async function getTrends(req: Request, res: Response) {
  const userId = req.user!.id;
  const { from, to, bucket } = TrendsQ.parse(req.query);
  const items = await svc.getTrends({ userId, from, to, bucket: bucket ?? 'day' });
  res.json(items);
}

export async function getErrors(req: Request, res: Response) {
  const userId = req.user!.id;
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 5)));
  const items = await svc.getErrors({ userId, limit, minAttempts: 3 });
  res.json(items);
}

export async function getHabits(req: Request, res: Response) {
  const userId = req.user!.id;
  const data = await svc.getHabits(userId);
  res.json(data);
}

export async function getClaimsStats(req: Request, res: Response) {
  const userId = req.user!.id;
  const data = await svc.getClaimsStats(userId);
  res.json(data);
}

/** GET /api/progress/badges  -> insignias del usuario autenticado */
export async function getMyBadges(req: AuthedReq, res: Response) {
  try {
    const userId = req.user!.id;
    const items = await svc.getBadges(userId);
    res.json(Array.isArray(items) ? items : []);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudieron listar las insignias' });
  }
}
export async function getMyWeeklyProgress(req: AuthedReq, res: Response) {
  try {
    const userId = req.user!.id;
    const row = await getWeeklyProgressRow(userId); // calcula sólo para el usuario actual (semana activa)
    res.json(row); // objeto o null
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No disponible' });
  }
}

