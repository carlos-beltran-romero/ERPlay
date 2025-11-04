/**
 * Módulo de middleware de manejo centralizado de errores
 * Proporciona un manejador global que procesa y formatea todos los errores de la aplicación
 * @module middlewares/errorHandler
 */

import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { HttpError } from "../core/errors/HttpError";

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
 * @example
 * // Configuración en app.ts
 * app.use(routes);
 * app.use(errorHandler); // Debe ir después de todas las rutas
 *
 * @example
 * // Los errores lanzados en cualquier parte llegan aquí
 * throw createHttpError(404, 'Usuario no encontrado');
 * // Respuesta: { "error": "Usuario no encontrado" } con status 404
 *
 * @example
 * // Errores de validación Zod se formatean automáticamente
 * schema.parse(invalidData);
 * // Respuesta: { "error": "El nombre es requerido; Email inválido" } con status 400
 *
 * @public
 */
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  // Identificar el tipo de error recibido
  const isHttpError = error instanceof HttpError;
  const isZodError = error instanceof ZodError;

  // Determinar el código de estado HTTP apropiado
  const statusCode = isHttpError
    ? error.statusCode // HttpError tiene código específico
    : isZodError
    ? 400 // Errores de validación siempre son 400 Bad Request
    : (error as any)?.status || 500; // Fallback a 500 Internal Server Error

  // Formatear el mensaje de error según el tipo
  const message = isZodError
    ? error.issues.map((issue) => issue.message).join("; ") // Concatenar todos los errores de validación
    : error.message || "Error interno"; // Usar mensaje del error o genérico

  // Logging diferenciado por severidad
  if (statusCode >= 500) {
    // Errores del servidor: log completo para debugging
    console.error("[ERROR]", error);
  } else {
    // Errores del cliente: log reducido con detalles si existen
    console.warn("[WARN]", message, isHttpError ? error.details : undefined);
  }

  // Enviar respuesta JSON consistente al cliente
  res.status(statusCode).json({ error: message });
};

export default errorHandler;
