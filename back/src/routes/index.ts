/**
 * Módulo de registro de rutas
 * Centraliza el registro de todos los módulos de rutas de la aplicación
 * @module routes/index
 */

import path from 'path';
import express, { Express } from 'express';

import { renderSwaggerUi } from '../core/swaggerUi';

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

/**
 * Registra todas las rutas de la aplicación
 * Monta los routers en el prefijo /api y configura el servicio de archivos estáticos
 * 
 * @param app - Instancia de Express donde se registrarán las rutas
 */
export default function registerRoutes(app: Express) {
  const apiRouter = express.Router();

  apiRouter.get('/docs', (_req, res) => {
    res.type('text/html').send(renderSwaggerUi('/api/openapi.yaml'));
  });
  apiRouter.get('/openapi.yaml', (_req, res) => {
    res.type('application/yaml').sendFile(path.resolve(__dirname, '../../openapi.yaml'));
  });

  // Rutas de autenticación y usuarios
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', userRoutes);

  // Rutas de diagramas y preguntas
  apiRouter.use('/diagrams', diagramRoutes);
  apiRouter.use('/questions', questionsRoutes);

  // Rutas de tests y exámenes
  apiRouter.use('/exams', examsRoutes);
  apiRouter.use('/test-sessions', testSessionsRoutes);

  // Rutas de reclamaciones y progreso
  apiRouter.use('/claims', claimsRoutes);
  apiRouter.use('/progress', progressRoutes);

  // Rutas de dashboard y supervisor
  apiRouter.use('/dashboard', dashboardRoutes);
  apiRouter.use('/supervisor', supervisorRoutes);

  // Rutas de administración
  apiRouter.use('/admin/diagrams', diagramStatsRoutes);

  // Montar router principal en /api
  app.use('/api', apiRouter);


}