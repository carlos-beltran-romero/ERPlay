/**
 * @module middlewares/uploadErrorHandler
 */
import { ErrorRequestHandler } from 'express';
import multer from 'multer';

import { createHttpError } from '../core/errors/HttpError';

const uploadErrorHandler: ErrorRequestHandler = (error, _req, _res, next) => {
  if (error instanceof multer.MulterError) {
    next(createHttpError(400, error.message));
    return;
  }

  if (error) {
    next(createHttpError(400, error.message));
    return;
  }

  next(error);
};

export default uploadErrorHandler;
