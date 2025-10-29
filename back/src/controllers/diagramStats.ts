// src/controllers/diagramStats.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { Diagram } from '../models/Diagram';
import { getDiagramStatsService } from '../services/diagramStats';

/**
 * Validación sencilla de query params:
 * - from/to: 'YYYY-MM-DD' (opcionales)
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
 * GET /api/admin/diagrams/:id/stats
 * Devuelve KPIs y, si el servicio los calcula, bloques opcionales:
 * - itemQuality, distractors, learningCurves, reliability, drift
 */
export const getDiagramStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1) Validar diagrama
    const diagram = await Diagram.findOne({ where: { id } });
    if (!diagram) {
      return res.status(404).json({ error: 'Diagrama no encontrado' });
    }

    // 2) Validar/normalizar rango de fechas
    const parsed = QueryZ.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Parámetros inválidos' });
    }

    let { from, to } = parsed.data;

    // Si ambos existen y están invertidos, los intercambiamos (usabilidad)
    if (from && to && new Date(from) > new Date(to)) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    // 3) Llamar al servicio de analytics (acepta { from, to } opcionales)
    const stats = await getDiagramStatsService(id, { from, to });

    // Evitamos cachear estos datos (depende del rango)
    res.setHeader('Cache-Control', 'no-store');

    return res.json(stats);
  } catch (err: any) {
    console.error('[diagramStats] error:', err);
    return res.status(500).json({ error: 'No se pudieron obtener las estadísticas' });
  }
};
