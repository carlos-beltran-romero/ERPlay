/**
 * @module core/errors/HttpError
 * Error de negocio con código HTTP asociado.
 */
export class HttpError extends Error {
  /** Código HTTP asociado al error. */
  public readonly statusCode: number;

  /** Datos adicionales opcionales para logging. */
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Crea un HttpError con tipado fluido.
 * @public
 */
export function createHttpError(statusCode: number, message: string, details?: unknown) {
  return new HttpError(statusCode, message, details);
}
