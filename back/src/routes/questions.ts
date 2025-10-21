// src/routes/questions.ts
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

// Crear pregunta (alumno o supervisor)
router.post('/', authenticate, createQuestion);

// Contador y listado de pendientes (solo supervisor)
router.get('/pending/count', authenticate, authorize('supervisor'), getPendingCount);
router.get('/pending', authenticate, authorize('supervisor'), listPending);

// Verificar (solo supervisor)
router.post('/:id/verify', authenticate, authorize('supervisor'), verifyQuestion);
router.get('/mine', authenticate, listMine);


export default router;
