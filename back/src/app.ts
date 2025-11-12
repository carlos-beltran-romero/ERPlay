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
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(logger);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use('/uploads', express.static(path.resolve('uploads')));
  registerRoutes(app);
  app.use(uploadErrorHandler);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export type Application = ReturnType<typeof createApp>;
