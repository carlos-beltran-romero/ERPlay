// src/server.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import registerRoutes from './routes';

// Middlewares
import logger from './middlewares/logger';
import uploadErrorHandler from './middlewares/uploadErrorHandler';
import notFound from './middlewares/notFound';
import errorHandler from './middlewares/errorHandler';

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(logger);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

registerRoutes(app);

app.use(uploadErrorHandler);
app.use(notFound);
app.use(errorHandler);

export default app;
