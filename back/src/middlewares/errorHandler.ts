/**
 * Módulo de middleware de manejo centralizado de errores
 * Proporciona un manejador global que procesa y formatea todos los errores de la aplicación
 * @module back/middlewares/errorHandler
 */

import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { HttpError } from '../core/errors/HttpError';

/**
 * Middleware de manejo centralizado de errores
 * Captura y procesa todos los errores lanzados en la aplicación, proporcionando
 * respuestas consistentes y logging apropiado según la severidad del error.
 * 
 * @param error Error capturado durante el procesamiento de la petición
 * @param _req Objeto Request de Express (no utilizado)
 * @param res Objeto Response de Express para enviar la respuesta de error
 * @param _next Función NextFunction (no utilizada en manejador de errores final)
 * 
 * @remarks
 * Este middleware debe ser el último en la cadena de middlewares de Express.
 * Maneja tres tipos principales de errores:
 * - HttpError: Errores de negocio con códigos HTTP específicos
 * - ZodError: Errores de validación de esquemas con mensajes detallados
 * - Error genérico: Cualquier otro error no esperado (500)
 * 
 * Comportamiento de logging:
 * - Errores >= 500: Se registran con console.error para debugging completo
 * - Errores < 500: Se registran con console.warn con información resumida
 * 
 * 
 * 
 * 
 * @public
 */
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