/**
 * Módulo de rutas de reclamaciones
 * Define endpoints para gestión de reclamaciones de estudiantes sobre preguntas
 * @module back/routes/claims
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import {
  createClaim,
  listMyClaims,
  listPendingClaims,
  getPendingClaimCount,
  verifyClaim,
} from '../controllers/claims';

const router = Router();

/**
 * POST /api/claims
 * Crea una nueva reclamación sobre una pregunta
 * @access Privado (alumno)
 */
router.post(
  '/',
  authenticate,
  authorize('alumno'),
  createClaim
);

/**
 * GET /api/claims/mine
 * Lista las reclamaciones del estudiante autenticado
 * @access Privado (alumno)
 */
router.get(
  '/mine',
  authenticate,
  authorize('alumno'),
  listMyClaims
);

/**
 * GET /api/claims/pending
 * Lista todas las reclamaciones pendientes de revisión
 * @access Privado (supervisor)
 */
router.get(
  '/pending',
  authenticate,
  authorize('supervisor'),
  listPendingClaims
);

/**
 * GET /api/claims/pending/count
 * Obtiene el contador de reclamaciones pendientes
 * @access Privado (supervisor)
 */
router.get(
  '/pending/count',
  authenticate,
  authorize('supervisor'),
  getPendingClaimCount
);

/**
 * POST /api/claims/:id/verify
 * Resuelve una reclamación (aprobar o rechazar)
 * @access Privado (supervisor)
 */
router.post(
  '/:id/verify',
  authenticate,
  authorize('supervisor'),
  verifyClaim
);

export default router;