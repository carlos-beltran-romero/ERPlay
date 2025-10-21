// src/middlewares/uploadErrorHandler.ts
import { ErrorRequestHandler } from 'express';
import multer from 'multer';

const uploadErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Handle Multer-specific errors
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }

  // Handle other upload-related errors
  if (err) {
    res.status(400).json({ error: err.message });
    return;
  }

  // If no error, delegate to next error handler or middleware
  next(err);
};

export default uploadErrorHandler;



