// back/src/routes/progress.ts
import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import * as ctrl from '../controllers/progress';

const r = Router();
r.use(authenticate);

r.get('/overview', ctrl.getOverview);
r.get('/trends', ctrl.getTrends);
r.get('/errors', ctrl.getErrors);
r.get('/habits', ctrl.getHabits);
r.get('/claims', ctrl.getClaimsStats);
r.get('/badges', ctrl.getMyBadges);
r.get('/weekly-goal/progress', ctrl.getMyWeeklyProgress);






export default r;
