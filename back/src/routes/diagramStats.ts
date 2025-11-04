/**
 * Módulo de rutas de estadísticas de diagramas
 * Define endpoints para obtener métricas y estadísticas de uso de diagramas
 * @module routes/diagramStats
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import { getDiagramStats } from '../controllers/diagramStats';

const router = Router();

/**
 * GET /api/admin/diagrams/:id/stats
 * Obtiene estadísticas de un diagrama en un rango de fechas
 * @query from - Fecha inicio (YYYY-MM-DD)
 * @query to - Fecha fin (YYYY-MM-DD)
 * @access Privado (supervisor)
 */
router.get(
  '/:id/stats',
  authenticate,
  authorize('supervisor'),
  async (req, res, next) => {
    try { 
      await getDiagramStats(req, res); 
    } catch (err) { 
      next(err); 
    }
  }
);

export default router;