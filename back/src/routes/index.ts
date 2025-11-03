import express, { Express } from 'express';
import path from 'node:path';
import authRoutes from './auth';
import claimsRoutes from './claims';
import dashboardRoutes from './dashboard';
import diagramRoutes from './diagrams';
import diagramStatsRoutes from './diagramStats';
import examsRouter from './exams';
import progressRoutes from './progress';
import questionsRouter from './questions';
import supervisorRoutes from './supervisor';
import testSessionsRouter from './testSession';
import userRoutes from './users';

export default function registerRoutes(app: Express): void {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/diagrams', diagramRoutes);
  app.use('/api/questions', questionsRouter);
  app.use('/api/exams', examsRouter);
  app.use('/api/claims', claimsRoutes);
  app.use('/api/test-sessions', testSessionsRouter);
  app.use('/api/progress', progressRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/supervisor', supervisorRoutes);
  app.use('/api/admin/diagrams', diagramStatsRoutes);

  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
      fallthrough: true,
    })
  );
}
