import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import { listRecentActivity } from '../controllers/dashboard';

const router = Router();

/** Alumno: actividad reciente del dashboard */
router.get(
  '/recent',
  authenticate,
  authorize('alumno'),
  listRecentActivity
);

export default router;
