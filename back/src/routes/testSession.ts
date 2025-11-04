/**
 * Módulo de rutas de sesiones de test
 * Define endpoints para crear, actualizar y gestionar sesiones de test de estudiantes
 * @module routes/testSession
 */

import { Router } from "express";
import {
  startTestSession,
  patchTestResult,
  logTestEvent,
  finishTestSession,
  listMySessions,
  getSessionDetail,
} from "../controllers/testSession";

const router = Router();

/**
 * POST /api/test-sessions/start
 * Inicia una nueva sesión de test
 * @access Privado (alumno)
 */
router.post("/start", startTestSession);

/**
 * PATCH /api/test-sessions/:sessionId/results/:resultId
 * Actualiza resultado de una pregunta específica (respuesta, hint usado, etc.)
 * @access Privado (alumno)
 */
router.patch("/:sessionId/results/:resultId", patchTestResult);

/**
 * POST /api/test-sessions/:sessionId/events
 * Registra un evento durante la sesión de test
 * @access Privado (alumno)
 */
router.post("/:sessionId/events", logTestEvent);

/**
 * POST /api/test-sessions/:sessionId/finish
 * Finaliza una sesión de test y calcula resultados
 * @access Privado (alumno)
 */
router.post("/:sessionId/finish", finishTestSession);

/**
 * GET /api/test-sessions/mine
 * Lista sesiones de test del usuario autenticado
 * @access Privado (alumno)
 */
router.get("/mine", listMySessions);

/**
 * GET /api/test-sessions/:sessionId
 * Obtiene detalle completo de una sesión de test
 * @access Privado (alumno)
 */
router.get("/:sessionId", getSessionDetail);

export default router;
