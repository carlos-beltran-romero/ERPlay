/**
 * @module app
 * Factoría principal de la aplicación Express.
 */
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';

import { env } from './config/env';
import errorHandler from './middlewares/errorHandler';
import logger from './middlewares/logger';
import notFound from './middlewares/notFound';
import registerRoutes from './routes';
import uploadErrorHandler from './middlewares/uploadErrorHandler';

/**
 * Construye una instancia de Express con todos los middlewares comunes.
 * @public
 */
export function createApp() {
  const app = express();

  // Seguridad básica
  app.use(
    helmet({
      // Permitimos servir ficheros estáticos (uploads) a otros orígenes si hace falta
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS (ajusta FRONTEND_URL si usas dominio real)
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );

  // Logger
  app.use(logger);

  // Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // ===== Endpoints previos al router =====

  // Healthcheck para Docker/Nginx/K8s
  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Servir archivos subidos (p. ej. /uploads/diagrams/xxx.png)
  app.use('/uploads', express.static(path.resolve('uploads')));

  // ===== Rutas de la API (montadas en /api) =====
  registerRoutes(app);

  // Manejo de errores de subida (multer, etc.)
  app.use(uploadErrorHandler);

  // 404 (si nada anterior respondió)
  app.use(notFound);

  // Manejador de errores final
  app.use(errorHandler);

  return app;
}

export type Application = ReturnType<typeof createApp>;
