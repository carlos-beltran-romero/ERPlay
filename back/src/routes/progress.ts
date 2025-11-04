/**
 * Módulo de rutas de progreso
 * Define endpoints para obtener métricas de progreso y rendimiento del estudiante
 * @module routes/progress
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import * as ctrl from '../controllers/progress';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/progress/overview
 * Obtiene resumen general de progreso del estudiante
 * @access Privado (alumno)
 */
router.get('/overview', ctrl.getOverview);

/**
 * GET /api/progress/trends
 * Obtiene tendencias de rendimiento a lo largo del tiempo
 * @access Privado (alumno)
 */
router.get('/trends', ctrl.getTrends);

/**
 * GET /api/progress/errors
 * Obtiene análisis de errores frecuentes
 * @access Privado (alumno)
 */
router.get('/errors', ctrl.getErrors);

/**
 * GET /api/progress/habits
 * Obtiene estadísticas de hábitos de estudio
 * @access Privado (alumno)
 */
router.get('/habits', ctrl.getHabits);

/**
 * GET /api/progress/claims
 * Obtiene estadísticas de reclamaciones del estudiante
 * @access Privado (alumno)
 */
router.get('/claims', ctrl.getClaimsStats);

/**
 * GET /api/progress/badges
 * Obtiene insignias obtenidas por el estudiante
 * @access Privado (alumno)
 */
router.get('/badges', ctrl.getMyBadges);

/**
 * GET /api/progress/weekly-goal/progress
 * Obtiene progreso hacia el objetivo semanal
 * @access Privado (alumno)
 */
router.get('/weekly-goal/progress', ctrl.getMyWeeklyProgress);

export default router;