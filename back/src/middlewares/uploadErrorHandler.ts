/**
 * Módulo de middleware de manejo de errores de carga de archivos
 * Proporciona manejo especializado para errores generados por Multer durante la subida de archivos
 * @module back/middlewares/uploadErrorHandler
 */

import { ErrorRequestHandler } from 'express';
import multer from 'multer';

import { createHttpError } from '../core/errors/HttpError';

/**
 * Middleware de manejo de errores específico para operaciones de subida de archivos
 * Intercepta y transforma errores de Multer en respuestas HTTP consistentes con el resto de la API
 * 
 * @param error Error capturado durante la operación de subida
 * @param _req Objeto Request de Express (no utilizado)
 * @param _res Objeto Response de Express (no utilizado)
 * @param next Función NextFunction para pasar el error al siguiente manejador
 * 
 * @remarks
 * Este middleware debe colocarse inmediatamente después de los endpoints que usan uploadDiagramImage.
 * Transforma dos tipos de errores:
 * - MulterError: Errores específicos de Multer (tamaño excedido, tipo inválido, etc.)
 * - Error genérico: Cualquier otro error durante la validación o procesamiento
 * 
 * Errores comunes de Multer:
 * - LIMIT_FILE_SIZE: El archivo excede el límite de 5MB
 * - LIMIT_UNEXPECTED_FILE: Campo de archivo no esperado
 * - LIMIT_FILE_COUNT: Demasiados archivos enviados
 * 
 * 
 * @see {@link https://github.com/expressjs/multer#error-handling|Multer Error Handling}
 * @public
 */
const uploadErrorHandler: ErrorRequestHandler = (error, _req, _res, next) => {
  // Manejar errores específicos de Multer (tamaño, tipo, límites, etc.)
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