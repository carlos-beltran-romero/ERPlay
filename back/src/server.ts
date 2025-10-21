// src/server.ts
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import registerRoutes from './routes';

// Middlewares
import logger from './middlewares/logger';
import uploadErrorHandler from './middlewares/uploadErrorHandler';
import notFound from './middlewares/notFound';
import errorHandler from './middlewares/errorHandler';

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
// Enable CORS
app.use(cors({
    origin: process.env.FRONTEND_URL,   // orígenes permitidos
    credentials: true                  // si envías cookies o Authorization
  }));
// HTTP request logging
app.use(logger);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register application routes
registerRoutes(app);

// Handle file upload errors (e.g., multer)
app.use(uploadErrorHandler);

// 404 handler for unknown routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
