/**
 * Módulo de rutas de diagramas
 * Define endpoints CRUD para gestión de diagramas ER
 * @module routes/diagrams
 */

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
 * GET /api/diagrams/public
 * Lista diagramas disponibles para estudiantes
 * @access Privado (alumno, supervisor)
 * @note Debe ir antes de /:id para evitar conflictos de rutas
 */
router.get(
  '/public',
  authenticate,
  authorize('alumno', 'supervisor'),
  listPublicDiagrams
);

/**
 * GET /api/diagrams
 * Lista todos los diagramas del sistema
 * @access Privado (supervisor)
 */
router.get(
  '/',
  authenticate,
  authorize('supervisor'),
  listDiagrams
);

/**
 * GET /api/diagrams/:id
 * Obtiene detalles de un diagrama específico
 * @access Privado (supervisor)
 */
router.get(
  '/:id',
  authenticate,
  authorize('supervisor'),
  getDiagram
);

/**
 * POST /api/diagrams
 * Crea un nuevo diagrama con imagen
 * @access Privado (supervisor)
 */
router.post(
  '/',
  authenticate,
  authorize('supervisor'),
  uploadDiagramImage,
  createDiagram
);

/**
 * PUT /api/diagrams/:id
 * Actualiza un diagrama existente (imagen opcional)
 * @access Privado (supervisor)
 */
router.put(
  '/:id',
  authenticate,
  authorize('supervisor'),
  uploadDiagramImage,
  updateDiagram
);

/**
 * DELETE /api/diagrams/:id
 * Elimina un diagrama del sistema
 * @access Privado (supervisor)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('supervisor'),
  deleteDiagram
);

export default router;