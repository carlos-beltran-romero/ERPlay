/**
 * @module utils/asyncHandler
 */
import { RequestHandler } from "express";

/**
 * Envuelve un `RequestHandler` asíncrono propagando correctamente los errores.
 * Permite escribir controladores sin bloques try/catch repetitivos.
 *
 * @public
 * @param handler - Handler de Express con soporte para promesas.
 * @returns Handler seguro que delega en `next` ante errores.
 */
export function asyncHandler<
  Params = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, unknown> = Record<string, unknown>
>(handler: RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals>) {
  return ((req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  }) as RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals>;
}
