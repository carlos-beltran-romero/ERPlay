/**
 * @module middlewares/authorize
 */
import { RequestHandler } from 'express';

import { createHttpError } from '../core/errors/HttpError';

/**
 * Middleware de autorización basado en roles.
 * @public
 */
export default function authorize(...allowedRoles: string[]): RequestHandler {
  return (req, _res, next) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      next(createHttpError(403, 'Acceso denegado'));
      return;
    }

    next();
  };
}
