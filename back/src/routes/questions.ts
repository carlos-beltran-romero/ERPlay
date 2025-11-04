/**
 * Módulo de rutas de preguntas
 * Define endpoints para crear y gestionar preguntas de tests
 * @module routes/questions
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import {
  createQuestion,
  getPendingCount,
  listPending,
  verifyQuestion,
  listMine,
} from '../controllers/questions';

const router = Router();

/**
 * POST /api/questions
 * Crea una nueva pregunta
 * @access Privado (alumno, supervisor)
 */
router.post('/', authenticate, createQuestion);

/**
 * GET /api/questions/pending/count
 * Obtiene contador de preguntas pendientes de revisión
 * @access Privado (supervisor)
 */
router.get('/pending/count', authenticate, authorize('supervisor'), getPendingCount);

/**
 * GET /api/questions/pending
 * Lista preguntas pendientes de revisión
 * @access Privado (supervisor)
 */
router.get('/pending', authenticate, authorize('supervisor'), listPending);

/**
 * POST /api/questions/:id/verify
 * Verifica (aprueba/rechaza) una pregunta pendiente
 * @access Privado (supervisor)
 */
router.post('/:id/verify', authenticate, authorize('supervisor'), verifyQuestion);

/**
 * GET /api/questions/mine
 * Lista preguntas creadas por el usuario autenticado
 * @access Privado (alumno, supervisor)
 */
router.get('/mine', authenticate, listMine);

export default router;