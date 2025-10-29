// src/routes/diagramStats.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import { getDiagramStats } from '../controllers/diagramStats';

const router = Router();

/**
 * Stats de un diagrama — Solo supervisor
 * GET /api/diagram-stats/:id?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get(
  '/:id/stats',
  authenticate,
  authorize('supervisor'),
  async (req, res, next) => {
    try { await getDiagramStats(req, res); } catch (err) { next(err); }
  }
);

export default router;
