/**
 * Módulo de rutas de dashboard
 * Define endpoints para obtener datos del dashboard de estudiantes
 * @module back/routes/dashboard
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import { listRecentActivity } from '../controllers/dashboard';

const router = Router();

/**
 * GET /api/dashboard/recent
 * Obtiene actividad reciente del estudiante para el dashboard
 * @access Privado (alumno)
 */
router.get(
  '/recent',
  authenticate,
  authorize('alumno'),
  listRecentActivity
);

export default router;