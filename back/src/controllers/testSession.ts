import { RequestHandler } from 'express';
import { TestSessionsService } from '../services/testSession';
import jwt, { JwtPayload } from 'jsonwebtoken';

const svc = new TestSessionsService();

function authUserId(req: any): string {
  // 1) Si ya viene de un middleware, úsalo
  const inCtx = req?.user?.id || req?.auth?.userId || req?.auth?.id;
  if (inCtx) return String(inCtx);

  // 2) Si no, intenta leer Authorization: Bearer <token>
  const auth = (req.headers?.authorization || '').trim();
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error('No autenticado');

  const token = m[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Falta JWT_SECRET en el servidor');

  // Nota: si usas RS256, aquí usarías la PUBLIC KEY en verify()
  const payload = jwt.verify(token, secret) as JwtPayload | any;

  const uid = payload?.sub || payload?.id || payload?.userId || payload?.uid;
  if (!uid) throw new Error('Token inválido (sin user id)');
  return String(uid);
}

// Inicia sesión de test
export const startTestSession: RequestHandler = async (req, res) => {
  try {
    const userId = authUserId(req);
    const { mode, limit } = req.body as { mode: 'learning' | 'exam' | 'errors'; limit?: number };
    if (!mode) {
      res.status(400).json({ error: 'mode es obligatorio' });
      return;
    }
    const payload = await svc.startSession({ userId, mode, limit });
    res.json(payload);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudo iniciar el test' });
  }
};

// Actualiza resultado (respuesta, tiempo, etc.)
export const patchTestResult: RequestHandler = async (req, res) => {
  try {
    const userId = authUserId(req);
    const { sessionId, resultId } = req.params;
    const body = req.body as Partial<{
      selectedIndex: number | null;
      attemptsDelta: number;
      usedHint: boolean;
      revealedAnswer: boolean;
      timeSpentSecondsDelta: number;
    }>;
    await svc.patchResult({ userId, sessionId, resultId, body });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudo guardar' });
  }
};

// Log de eventos
export const logTestEvent: RequestHandler = async (req, res) => {
  try {
    const userId = authUserId(req);
    const { sessionId } = req.params;
    const body = req.body as { type: string; resultId?: string; payload?: any };
    await svc.logEvent({ userId, sessionId, ...body });
    res.json({ ok: true });
  } catch {
    // best-effort
    res.json({ ok: true });
  }
};

// Finaliza la sesión y calcula resumen
export const finishTestSession: RequestHandler = async (req, res) => {
  try {
    const userId = authUserId(req);
    const { sessionId } = req.params;
    const payload = await svc.finishSession({ userId, sessionId });
    res.json(payload);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudo finalizar' });
  }
};

// ====== Endpoints para "Mis tests" ======

export const listMySessions: RequestHandler = async (req, res) => {
  try {
    const userId = authUserId(req);
    const { mode, dateFrom, dateTo, q } = (req.query || {}) as {
      mode?: 'learning' | 'exam' | 'errors';
      dateFrom?: string;
      dateTo?: string;
      q?: string;
    };
    const rows = await svc.listMine({ userId, mode, dateFrom, dateTo, q });
    res.json(rows);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'No se pudo listar tus tests' });
  }
};

export const getSessionDetail: RequestHandler = async (req, res) => {
  try {
    const userId = authUserId(req);
    const { sessionId } = req.params;
    const data = await svc.getOne({ userId, sessionId });
    res.json(data);
  } catch (e: any) {
    res.status(404).json({ error: e?.message || 'Test no encontrado' });
  }
};
