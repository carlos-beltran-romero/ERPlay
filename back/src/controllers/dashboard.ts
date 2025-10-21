import { Request, Response } from 'express';
import { getRecentActivity } from '../services/dashboard';

export async function listRecentActivity(req: Request, res: Response) {
  // Si tienes un tipo AuthRequest con user tipado, úsalo aquí
  // @ts-ignore
  const userId: string = req.user!.id;
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 8)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const items = await getRecentActivity(userId, limit, offset);
  res.json(items);
}
