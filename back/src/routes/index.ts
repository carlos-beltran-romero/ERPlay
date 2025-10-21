// src/routes/index.ts
import { Express } from 'express';
import express from 'express';

import authRoutes from './auth';
import userRoutes from './users';
import diagramRoutes from './diagrams';
import path from 'path';
import examsRouter from './exams';
import claimsRoutes from './claims';
import testSessionsRouter from './testSession';
import progressRoutes from './progress';
import dashboardRoutes from './dashboard';
import supervisorRoutes from './supervisor';




import questionsRouter from './questions';


export default function registerRoutes(app: Express) {
  app.use('/api', (req, _res, next) => {
    console.log('[API IN]', req.method, req.path);
    next();
  });
  
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/diagrams', diagramRoutes);
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
      fallthrough: true, // 404 si no existe el archivo
    })
  );
  app.use('/api/questions', questionsRouter);
  app.use('/api/exams', examsRouter);
  app.use('/api/claims', claimsRoutes);
  app.use('/api/test-sessions', testSessionsRouter);
  app.use('/api/progress', progressRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api', (req, _res, next) => {
    console.log('[API IN]', req.method, req.path);
    next();
  });
  app.use('/api/supervisor', supervisorRoutes);



  

}
