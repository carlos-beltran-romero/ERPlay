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

/** Alumno crea una reclamación */
router.post(
  '/',
  authenticate,
  authorize('alumno'),
  createClaim
);

/** Alumno ve sus reclamaciones */
router.get(
  '/mine',
  authenticate,
  authorize('alumno'),
  listMyClaims
);

/** Supervisor: listado y contador de pendientes */
router.get(
  '/pending',
  authenticate,
  authorize('supervisor'),
  listPendingClaims
);

router.get(
  '/pending/count',
  authenticate,
  authorize('supervisor'),
  getPendingClaimCount
);

/** Supervisor resuelve una reclamación */
router.post(
  '/:id/verify',
  authenticate,
  authorize('supervisor'),
  verifyClaim
);

export default router;
