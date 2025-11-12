/**
 * Módulo del controlador de estadísticas de diagramas
 * Gestiona las peticiones relacionadas con análisis y métricas de diagramas
 * @module back/controllers/diagramStats
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { Diagram } from '../models/Diagram';
import { getDiagramStatsService } from '../services/diagramStats';

/**
 * Esquema de validación para parámetros de consulta
 */
const QueryZ = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Formato esperado YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Formato esperado YYYY-MM-DD')
    .optional(),
});

/**
 * Obtiene estadísticas detalladas de un diagrama
 * @param req Objeto Request de Express con ID de diagrama y rango de fechas
 * @param res Objeto Response de Express
 */
export const getDiagramStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const diagram = await Diagram.findOne({ where: { id } });
    if (!diagram) {
      return res.status(404).json({ error: 'Diagrama no encontrado' });
    }

    const parsed = QueryZ.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Parámetros inválidos' });
    }

    let { from, to } = parsed.data;
    if (from && to && new Date(from) > new Date(to)) {
      [from, to] = [to, from];
    }

    const stats = await getDiagramStatsService(id, { from, to });
    res.setHeader('Cache-Control', 'no-store');
    return res.json(stats);
  } catch (err: any) {
    console.error('[diagramStats] error:', err);
    return res.status(500).json({ error: 'No se pudieron obtener las estadísticas' });
  }
};