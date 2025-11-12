/**
 * Módulo del controlador de sesiones de test
 * Gestiona las peticiones relacionadas con la creación, actualización y finalización de sesiones de test
 * @module back/controllers/testSession
 */

import { RequestHandler } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { createHttpError } from '../core/errors/HttpError';
import { asyncHandler } from '../utils/asyncHandler';
import { TestSessionsService } from '../services/testSession';

const testSessionsService = new TestSessionsService();

/**
 * Funciones auxiliares para autenticación
 */

/**
 * Resuelve y extrae el ID del usuario desde diferentes fuentes de autenticación
 * Intenta obtener el ID desde req.user, req.auth o decodificando el token JWT
 * @param req Objeto Request de Express
 * @returns ID del usuario autenticado
 * @throws {HttpError} 401 si no se encuentra autenticación válida
 */
const resolveUserId = (req: any): string => {
  const contextualId = req?.user?.id || req?.auth?.userId || req?.auth?.id;
  if (contextualId) return String(contextualId);

  const authorization = (req.headers?.authorization || '').trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw createHttpError(401, 'No autenticado');

  const token = match[1];
  const secret = env.JWT_SECRET;
  const payload = jwt.verify(token, secret) as JwtPayload & {
    id?: string;
    userId?: string;
    uid?: string;
  };

  const uid = payload.sub ?? payload.id ?? payload.userId ?? payload.uid;
  if (!uid) throw createHttpError(401, 'Token inválido (sin user id)');

  return String(uid);
};

/**
 * Inicia una nueva sesión de test para el usuario
 * Soporta tres modos: learning (aprendizaje), exam (examen) y errors (repaso de errores)
 * @param req Objeto Request de Express con mode y limit opcional en el body
 * @param res Objeto Response de Express
 * @returns Datos de la sesión iniciada incluyendo preguntas y configuración
 */
export const startTestSession: RequestHandler = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const { mode, limit } = req.body as { mode: 'learning' | 'exam' | 'errors'; limit?: number };
  
  if (!mode) {
    throw createHttpError(400, 'mode es obligatorio');
  }

  const payload = await testSessionsService.startSession({ userId, mode, limit });
  res.json(payload);
});

/**
 * Actualiza parcialmente un resultado de test específico dentro de una sesión
 * Permite registrar respuestas, incrementar intentos, uso de pistas y tiempo invertido
 * @param req Objeto Request de Express con sessionId y resultId en params, y datos a actualizar en body
 * @param res Objeto Response de Express
 */
export const patchTestResult: RequestHandler = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const { sessionId, resultId } = req.params;
  const body = req.body as Partial<{
    selectedIndex: number | null;
    attemptsDelta: number;
    usedHint: boolean;
    revealedAnswer: boolean;
    timeSpentSecondsDelta: number;
  }>;

  await testSessionsService.patchResult({ userId, sessionId, resultId, body });
  res.json({ ok: true });
});

/**
 * Registra un evento durante la sesión de test para análisis y seguimiento
 * Útil para tracking de comportamiento del usuario durante el test
 * @param req Objeto Request de Express con sessionId en params y datos del evento en body
 * @param res Objeto Response de Express
 */
export const logTestEvent: RequestHandler = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const { sessionId } = req.params;
  const body = req.body as { type: string; resultId?: string; payload?: unknown };

  await testSessionsService.logEvent({ userId, sessionId, ...body });
  res.json({ ok: true });
});

/**
 * Finaliza una sesión de test en curso
 * Calcula estadísticas finales, actualiza progreso y registra resultados
 * @param req Objeto Request de Express con sessionId en params
 * @param res Objeto Response de Express
 * @returns Resumen de la sesión completada con estadísticas y resultados
 */
export const finishTestSession: RequestHandler = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const { sessionId } = req.params;
  const payload = await testSessionsService.finishSession({ userId, sessionId });
  res.json(payload);
});

/**
 * Lista todas las sesiones de test del usuario actual con filtros opcionales
 * Permite filtrar por modo, rango de fechas y búsqueda por texto
 * @param req Objeto Request de Express con filtros opcionales en query params
 * @param res Objeto Response de Express
 * @returns Lista de sesiones ordenadas por fecha de creación
 */
export const listMySessions: RequestHandler = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const { mode, dateFrom, dateTo, q } = (req.query || {}) as {
    mode?: 'learning' | 'exam' | 'errors';
    dateFrom?: string;
    dateTo?: string;
    q?: string;
  };

  const rows = await testSessionsService.listMine({ userId, mode, dateFrom, dateTo, q });
  res.json(rows);
});

/**
 * Obtiene los detalles completos de una sesión de test específica
 * Incluye todas las preguntas, respuestas del usuario y estadísticas detalladas
 * @param req Objeto Request de Express con sessionId en params
 * @param res Objeto Response de Express
 * @returns Datos completos de la sesión incluyendo resultados individuales de cada pregunta
 */
export const getSessionDetail: RequestHandler = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const { sessionId } = req.params;
  const data = await testSessionsService.getOne({ userId, sessionId });
  res.json(data);
});