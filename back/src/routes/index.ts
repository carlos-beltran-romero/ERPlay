/**
 * @module routes/index
 */
import express, { Express } from 'express';
import path from 'path';

import authRoutes from './auth';
import claimsRoutes from './claims';
import dashboardRoutes from './dashboard';
import diagramRoutes from './diagrams';
import diagramStatsRoutes from './diagramStats';
import examsRoutes from './exams';
import progressRoutes from './progress';
import questionsRoutes from './questions';
import supervisorRoutes from './supervisor';
import testSessionsRoutes from './testSession';
import userRoutes from './users';

export default function registerRoutes(app: Express) {
  const apiRouter = express.Router();

  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', userRoutes);
  apiRouter.use('/diagrams', diagramRoutes);
  apiRouter.use('/questions', questionsRoutes);
  apiRouter.use('/exams', examsRoutes);
  apiRouter.use('/claims', claimsRoutes);
  apiRouter.use('/test-sessions', testSessionsRoutes);
  apiRouter.use('/progress', progressRoutes);
  apiRouter.use('/dashboard', dashboardRoutes);
  apiRouter.use('/supervisor', supervisorRoutes);
  apiRouter.use('/admin/diagrams', diagramStatsRoutes);

  app.use('/api', apiRouter);

  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), { fallthrough: true }),
  );
}
