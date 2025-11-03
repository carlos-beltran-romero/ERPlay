/**
 * @module controllers/testSession
 */
import { RequestHandler } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { env } from '../config/env';
import { createHttpError } from '../core/errors/HttpError';
import { asyncHandler } from '../utils/asyncHandler';
import { TestSessionsService } from '../services/testSession';

const testSessionsService = new TestSessionsService();

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

export const startTestSession: RequestHandler = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const { mode, limit } = req.body as { mode: 'learning' | 'exam' | 'errors'; limit?: number };
  if (!mode) {
    throw createHttpError(400, 'mode es obligatorio');
  }

  const payload = await testSessionsService.startSession({ userId, mode, limit });
  res.json(payload);
});

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

export const logTestEvent: RequestHandler = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const { sessionId } = req.params;
  const body = req.body as { type: string; resultId?: string; payload?: unknown };

  await testSessionsService.logEvent({ userId, sessionId, ...body });
  res.json({ ok: true });
});

export const finishTestSession: RequestHandler = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const { sessionId } = req.params;
  const payload = await testSessionsService.finishSession({ userId, sessionId });
  res.json(payload);
});

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

export const getSessionDetail: RequestHandler = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const { sessionId } = req.params;
  const data = await testSessionsService.getOne({ userId, sessionId });
  res.json(data);
});
