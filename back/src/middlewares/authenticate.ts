/**
 * Módulo de middleware de autenticación
 * Proporciona funciones para validar tokens JWT y proteger rutas de la API
 * @module middlewares/authenticate
 */

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { createHttpError } from '../core/errors/HttpError';
import { UserRole } from '../models/User';

/**
 * Middleware de autenticación que valida el token JWT en las peticiones
 * Extrae y verifica el token JWT del header Authorization, decodifica el payload
 * y adjunta la información del usuario autenticado al objeto Request
 * 
 * @param req Objeto Request de Express
 * @param res Objeto Response de Express
 * @param next Función NextFunction para continuar con el siguiente middleware
 * 
 * @throws {HttpError} 401 si no se proporciona el token en el header Authorization
 * @throws {HttpError} 401 si el token es inválido, está mal formado o ha expirado
 * @throws {HttpError} 403 si el rol del usuario no es válido según los roles definidos
 * 
 * @remarks
 * El token debe enviarse en el header Authorization con el formato: "Bearer <token>"
 * Una vez validado, el usuario autenticado queda disponible en req.user con { id, role }
 * 
 * @example
 * // Uso en rutas protegidas
 * router.get('/protected', authenticate, controller);
 * 
 * // Acceso al usuario autenticado en el controlador
 * const userId = req.user.id;
 * const userRole = req.user.role;
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  // Validar que exista el header de autorización
  if (!authHeader) {
    next(createHttpError(401, 'Token no proporcionado'));
    return;
  }

  // Extraer el token del formato "Bearer <token>"
  const token = authHeader.split(' ')[1];

  try {
    // Verificar y decodificar el token JWT
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role: UserRole };

    // Validar que el rol sea uno de los permitidos en el sistema
    if (!Object.values(UserRole).includes(decoded.role)) {
      next(createHttpError(403, 'Rol no válido'));
      return;
    }

    // Adjuntar información del usuario autenticado al request
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    // Capturar errores de verificación del token (expirado, inválido, mal formado)
    next(createHttpError(401, 'Token inválido o expirado'));
  }
}