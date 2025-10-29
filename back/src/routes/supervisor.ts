// back/src/routes/supervisor.ts
import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import * as ctrl from '../controllers/supervisor';

const r = Router();

r.use(authenticate, authorize('supervisor'));

r.use((req, _res, next) => {
    console.log('[supervisor router]', req.method, req.path);
    next();
  });

r.get('/students/:studentId', ctrl.getStudent);
r.get('/students/:studentId/progress/overview', ctrl.getOverview);
r.get('/students/:studentId/progress/trends', ctrl.getTrends);
r.get('/students/:studentId/progress/errors', ctrl.getErrors);

r.get('/students/:studentId/claims/stats', ctrl.getClaimsStats);
r.get('/students/:studentId/claims', ctrl.listUserClaims);

r.get('/students/:studentId/badges', ctrl.getStudentBadges);

r.get('/students/:studentId/questions', ctrl.listCreatedQuestions);



r.get('/students/:studentId/tests', ctrl.listUserSessions);
r.get('/students/:studentId/tests/:sessionId', ctrl.getUserSessionDetail);

// ✅ Objetivo semanal
r.get('/weekly-goal', ctrl.getWeeklyGoal);
r.put('/weekly-goal', ctrl.putWeeklyGoal);
r.post('/weekly-goal', ctrl.putWeeklyGoal); // ⬅️ alias para entornos que no pasan PUT
r.get('/weekly-goal/progress', ctrl.getWeeklyGoalProgress);

export default r;
