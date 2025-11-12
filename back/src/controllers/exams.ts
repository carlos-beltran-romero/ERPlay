/**
 * Módulo del controlador de exámenes
 * Gestiona las peticiones relacionadas con la realización de exámenes
 * @module back/controllers/exams
 */

import { Request, Response } from 'express';
import { ExamsService } from '../services/exams';

const svc = new ExamsService();

/**
 * Inicia un nuevo examen aleatorio
 * @param req Objeto Request de Express con límite de preguntas
 * @param res Objeto Response de Express
 */
export const startExam = async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
    const payload = await svc.startRandomExam(limit);
    res.json(payload);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No se pudo iniciar el examen' });
  }
};