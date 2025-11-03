/**
 * @module middlewares/notFound
 */
import { Request, Response } from 'express';

export default function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}
