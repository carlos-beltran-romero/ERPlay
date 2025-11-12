/**
 * Módulo de rutas de supervisor
 * Define endpoints para supervisores gestionar estudiantes, estadísticas y objetivos
 * @module back/routes/supervisor
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import * as ctrl from '../controllers/supervisor';

const router = Router();

router.use(authenticate, authorize('supervisor'));

router.use((req, _res, next) => {
  console.log('[supervisor router]', req.method, req.path);
  next();
});

/**
 * GET /api/supervisor/students/:studentId
 * Obtiene información básica de un estudiante
 * @access Privado (supervisor)
 */
router.get('/students/:studentId', ctrl.getStudent);

/**
 * GET /api/supervisor/students/:studentId/progress/overview
 * Obtiene resumen de progreso del estudiante
 * @access Privado (supervisor)
 */
router.get('/students/:studentId/progress/overview', ctrl.getOverview);

/**
 * GET /api/supervisor/students/:studentId/progress/trends
 * Obtiene tendencias de rendimiento del estudiante
 * @access Privado (supervisor)
 */
router.get('/students/:studentId/progress/trends', ctrl.getTrends);

/**
 * GET /api/supervisor/students/:studentId/progress/errors
 * Obtiene análisis de errores del estudiante
 * @access Privado (supervisor)
 */
router.get('/students/:studentId/progress/errors', ctrl.getErrors);

/**
 * GET /api/supervisor/students/:studentId/claims/stats
 * Obtiene estadísticas de reclamaciones del estudiante
 * @access Privado (supervisor)
 */
router.get('/students/:studentId/claims/stats', ctrl.getClaimsStats);

/**
 * GET /api/supervisor/students/:studentId/claims
 * Lista reclamaciones del estudiante
 * @access Privado (supervisor)
 */
router.get('/students/:studentId/claims', ctrl.listUserClaims);

/**
 * GET /api/supervisor/students/:studentId/badges
 * Obtiene insignias del estudiante
 * @access Privado (supervisor)
 */
router.get('/students/:studentId/badges', ctrl.getStudentBadges);

/**
 * GET /api/supervisor/students/:studentId/questions
 * Lista preguntas creadas por el estudiante
 * @access Privado (supervisor)
 */
router.get('/students/:studentId/questions', ctrl.listCreatedQuestions);

/**
 * GET /api/supervisor/students/:studentId/tests
 * Lista sesiones de test del estudiante
 * @access Privado (supervisor)
 */
router.get('/students/:studentId/tests', ctrl.listUserSessions);

/**
 * GET /api/supervisor/students/:studentId/tests/:sessionId
 * Obtiene detalle de una sesión de test específica
 * @access Privado (supervisor)
 */
router.get('/students/:studentId/tests/:sessionId', ctrl.getUserSessionDetail);

/**
 * GET /api/supervisor/weekly-goal
 * Obtiene el objetivo semanal actual
 * @access Privado (supervisor)
 */
router.get('/weekly-goal', ctrl.getWeeklyGoal);

/**
 * PUT /api/supervisor/weekly-goal
 * Actualiza el objetivo semanal
 * @access Privado (supervisor)
 */
router.put('/weekly-goal', ctrl.putWeeklyGoal);

/**
 * POST /api/supervisor/weekly-goal
 * Actualiza el objetivo semanal (alias para PUT)
 * @access Privado (supervisor)
 */
router.post('/weekly-goal', ctrl.putWeeklyGoal);

/**
 * GET /api/supervisor/weekly-goal/progress
 * Obtiene progreso de todos los estudiantes hacia el objetivo semanal
 * @access Privado (supervisor)
 */
router.get('/weekly-goal/progress', ctrl.getWeeklyGoalProgress);

export default router;