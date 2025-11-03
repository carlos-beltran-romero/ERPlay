/**
 * @module middlewares/errorHandler
 */
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { HttpError } from '../core/errors/HttpError';

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const isHttpError = error instanceof HttpError;
  const isZodError = error instanceof ZodError;

  const statusCode = isHttpError
    ? error.statusCode
    : isZodError
      ? 400
      : (error as any)?.status || 500;

  const message = isZodError
    ? error.issues.map((issue) => issue.message).join('; ')
    : error.message || 'Error interno';

  if (statusCode >= 500) {
    console.error('[ERROR]', error);
  } else {
    console.warn('[WARN]', message, isHttpError ? error.details : undefined);
  }

  res.status(statusCode).json({ error: message });
};

export default errorHandler;
