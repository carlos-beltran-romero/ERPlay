// src/middlewares/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;              
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { id: string; role: UserRole };

    if (!Object.values(UserRole).includes(decoded.role)) {
      res.status(403).json({ error: 'Rol no válido' });
      return;
    }

    req.user = { id: decoded.id, role: decoded.role };
    next();               // <— seguimos con la cadena de middlewares
  } catch {
    res.status(403).json({ error: 'Token inválido o expirado' });
    return;
  }
}
