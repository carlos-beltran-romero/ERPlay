/**
 * Módulo de errores HTTP personalizados
 * Proporciona una clase de error extendida que incluye códigos de estado HTTP
 * para facilitar el manejo de errores en las respuestas de la API
 * @module core/errors/HttpError
 */

/**
 * Clase de error personalizada que asocia un código de estado HTTP
 * Extiende la clase Error nativa de JavaScript para incluir información
 * específica del protocolo HTTP y datos adicionales para debugging
 */
export class HttpError extends Error {
  /** 
   * Código HTTP asociado al error
   * Ejemplos: 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Internal Server Error)
   */
  public readonly statusCode: number;

  /** 
   * Datos adicionales opcionales para logging y debugging
   * Puede contener información contextual del error como validaciones fallidas,
   * stack traces adicionales o cualquier metadata relevante
   */
  public readonly details?: unknown;

  /**
   * Crea una nueva instancia de HttpError
   * @param statusCode Código de estado HTTP que representa el tipo de error (ej: 400, 404, 500)
   * @param message Mensaje descriptivo del error para el usuario o desarrollador
   * @param details Información adicional opcional sobre el error para debugging
   */
  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Factory function para crear instancias de HttpError con tipado fluido
 * @param statusCode Código de estado HTTP (400, 401, 403, 404, 500, etc.)
 * @param message Mensaje descriptivo del error
 * @param details Información adicional opcional para debugging
 * @returns Nueva instancia de HttpError con los parámetros especificados
 * @example
 * throw createHttpError(404, 'Usuario no encontrado', { userId: '123' });
 * throw createHttpError(400, 'Datos inválidos');
 * throw createHttpError(403, 'No autorizado');
 */
export function createHttpError(statusCode: number, message: string, details?: unknown) {
  return new HttpError(statusCode, message, details);
}