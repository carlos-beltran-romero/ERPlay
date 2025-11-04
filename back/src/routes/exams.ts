/**
 * Módulo de rutas de exámenes
 * Define endpoints para iniciar y gestionar exámenes
 * @module routes/exams
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import { startExam } from '../controllers/exams';

const router = Router();

/**
 * GET /api/exams/start
 * Inicia una nueva sesión de examen para el estudiante
 * @access Privado (alumno)
 */
router.get('/start', authenticate, authorize('alumno'), startExam);

export default router;