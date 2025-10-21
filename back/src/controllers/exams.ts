import { Request, Response } from 'express';
import { ExamsService } from '../services/exams';

const svc = new ExamsService();

export const startExam = async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
    const payload = await svc.startRandomExam(limit);
    res.json(payload);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No se pudo iniciar el examen' });
  }
};
