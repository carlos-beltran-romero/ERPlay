// src/routes/diagrams.ts
import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import { uploadDiagramImage } from '../middlewares/upload';
import {
  listDiagrams,
  getDiagram,
  createDiagram,
  updateDiagram,
  deleteDiagram,
  listPublicDiagrams,
} from '../controllers/diagrams';

const router = Router();

/**
 * IMPORTANTE: las rutas específicas primero
 * /public debe ir antes que /:id
 */

// Listado "público" (autenticado) para alumno/supervisor
router.get(
  '/public',
  authenticate,
  authorize('alumno', 'supervisor'),
  // usa el handler específico si lo tienes; si no, podrías reutilizar listDiagrams
  listPublicDiagrams
);

// Lista completa (solo supervisor)
router.get(
  '/',
  authenticate,
  authorize('supervisor'),
  listDiagrams
);

// Detalle por id (solo supervisor)
router.get(
  '/:id',
  authenticate,
  authorize('supervisor'),
  getDiagram
);

// Crear (solo supervisor)
router.post(
  '/',
  authenticate,
  authorize('supervisor'),
  uploadDiagramImage,   // campo 'image'
  createDiagram
);

// Actualizar (solo supervisor)
router.put(
  '/:id',
  authenticate,
  authorize('supervisor'),
  uploadDiagramImage,   // opcional
  updateDiagram
);

// Eliminar (solo supervisor)
router.delete(
  '/:id',
  authenticate,
  authorize('supervisor'),
  deleteDiagram
);

export default router;
