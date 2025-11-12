/**
 * Módulo de middleware de autorización
 * Proporciona funciones para restringir el acceso a rutas según roles de usuario
 * @module middlewares/authorize
 */

import { RequestHandler } from 'express';

import { createHttpError } from '../core/errors/HttpError';

/**
 * Middleware de autorización basado en roles
 * Crea un middleware que valida si el usuario autenticado tiene uno de los roles permitidos
 * para acceder a un recurso específico. Debe usarse después del middleware authenticate.
 * 
 * @param allowedRoles Lista variable de roles permitidos para acceder al recurso
 * @returns Middleware RequestHandler que valida el rol del usuario
 * 
 * @throws {HttpError} 403 si el usuario no tiene ninguno de los roles permitidos
 * @throws {HttpError} 403 si no se encuentra información de rol en el request (usuario no autenticado)
 * 
 * @remarks
 * Este middleware asume que req.user ya fue establecido por el middleware authenticate.
 * Si req.user no existe o no tiene rol, se considera un acceso no autorizado.
 * 
 * @example
 * // Permitir solo a supervisores
 * router.delete('/users/:id', authenticate, authorize(UserRole.SUPERVISOR), deleteUser);
 * 
 * @example
 * // Permitir a múltiples roles
 * router.get('/data', authenticate, authorize(UserRole.SUPERVISOR, UserRole.ADMIN), getData);
 * 
 * @example
 * // Rutas públicas no necesitan este middleware
 * router.get('/public', publicController);
 * 
 * @example
 * // Rutas autenticadas sin restricción de rol
 * router.get('/profile', authenticate, getProfile);
 * 
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