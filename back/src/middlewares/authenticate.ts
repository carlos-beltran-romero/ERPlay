/**
 * @module middlewares/authenticate
 */
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { createHttpError } from '../core/errors/HttpError';
import { UserRole } from '../models/User';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next(createHttpError(401, 'Token no proporcionado'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role: UserRole };

    if (!Object.values(UserRole).includes(decoded.role)) {
      next(createHttpError(403, 'Rol no válido'));
      return;
    }

    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    next(createHttpError(401, 'Token inválido o expirado'));
  }
}
