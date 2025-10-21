// src/middlewares/errorHandler.ts
import { ErrorRequestHandler } from 'express';

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Error interno' });
  // No explicit return, function signature is void
};

export default errorHandler;