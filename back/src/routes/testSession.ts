import { Router } from 'express';
import {
  startTestSession,
  patchTestResult,
  logTestEvent,
  finishTestSession,
  listMySessions,
  getSessionDetail,
} from '../controllers/testSession';

const router = Router();

// para la app: /api/test-sessions/...
router.post('/start', startTestSession);
router.patch('/:sessionId/results/:resultId', patchTestResult);
router.post('/:sessionId/events', logTestEvent);
router.post('/:sessionId/finish', finishTestSession);

// para "Mis tests"
router.get('/mine', listMySessions);
router.get('/:sessionId', getSessionDetail);

export default router;
