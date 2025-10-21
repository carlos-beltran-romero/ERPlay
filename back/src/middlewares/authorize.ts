// src/middlewares/authorize.ts
import { RequestHandler } from 'express';

/**
 * Middleware de autorización por roles.
 * Solo deja pasar si req.user?.role está en allowedRoles.
 */
export default function authorize(...allowedRoles: string[]): RequestHandler {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      // No devolvemos el response, sino que enviamos y hacemos return void.
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    next();
  };
}
