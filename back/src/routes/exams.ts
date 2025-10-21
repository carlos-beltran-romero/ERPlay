import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import { startExam } from '../controllers/exams';

const router = Router();

// Iniciar examen (alumno)
router.get('/start', authenticate, authorize('alumno'), startExam);

export default router;
