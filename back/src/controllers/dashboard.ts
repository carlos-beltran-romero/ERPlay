/**
 * Módulo del controlador de dashboard
 * Gestiona las peticiones relacionadas con la actividad reciente
 * @module controllers/dashboard
 */

import { Request, Response } from "express";
import { getRecentActivity } from "../services/dashboard";

/**
 * Lista la actividad reciente del usuario
 * @param req Objeto Request de Express con id de usuario y parámetros de paginación
 * @param res Objeto Response de Express
 */
export async function listRecentActivity(req: Request, res: Response) {
  const userId: string = req.user!.id;
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 8)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const items = await getRecentActivity(userId, limit, offset);
  res.json(items);
}
