/**
 * Módulo del controlador de reclamaciones
 * Gestiona todas las peticiones HTTP relacionadas con las reclamaciones de estudiantes
 * @module controllers/claims
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { ClaimsService } from '../services/claims';
import { UserRole } from '../models/User';

type AuthUser = { id: string; role: UserRole; email?: string };
type AuthedReq = Request & { user?: AuthUser };

const claimsService = new ClaimsService();

/**
 * Esquemas de validación para reclamaciones
 */
const CreateClaimSchema = z.object({
  testResultId: z.string().uuid().optional().nullable(),
  questionId: z.string().uuid().optional().nullable(),
  diagramId: z.string().uuid(),
  prompt: z.string().min(1, 'El enunciado es obligatorio'),
  options: z.array(z.string().min(1)).min(2, 'Mínimo 2 opciones'),
  chosenIndex: z.number().int().nonnegative(),
  correctIndex: z.number().int().nonnegative(),
  explanation: z.string().min(5, 'La explicación es obligatoria'),
});

const VerifyClaimSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().max(2000).optional(),
});

/**
 * Crea una nueva reclamación por parte de un estudiante
 * @param req Objeto Request de Express que contiene los datos de la reclamación
 * @param res Objeto Response de Express
 * @returns La reclamación creada si todo es correcto
 */
export const createClaim = async (req: AuthedReq, res: Response) => {
  try {
    if (!req.user?.id || req.user.role !== UserRole.STUDENT) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    const input = CreateClaimSchema.parse(req.body);

    const result = await claimsService.createClaim({
      studentId: req.user.id,
      testResultId: input.testResultId ?? null,
      questionId: input.questionId ?? null,
      diagramId: input.diagramId,
      prompt: input.prompt,
      options: input.options,
      chosenIndex: input.chosenIndex,
      correctIndex: input.correctIndex,
      explanation: input.explanation,
    });

    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No se pudo registrar la reclamación' });
  }
};

/**
 * Lista todas las reclamaciones del estudiante actual
 * @param req Objeto Request de Express que contiene el ID del estudiante
 * @param res Objeto Response de Express
 */
export const listMyClaims = async (req: AuthedReq, res: Response) => {
  try {
    if (!req.user?.id || req.user.role !== UserRole.STUDENT) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    const rows = await claimsService.listMine(req.user.id);
    res.json(rows);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No se pudieron cargar tus reclamaciones' });
  }
};

/**
 * Lista todas las reclamaciones pendientes de revisión
 * @param req Objeto Request de Express
 * @param res Objeto Response de Express
 */
export const listPendingClaims = async (_req: AuthedReq, res: Response) => {
  try {
    const rows = await claimsService.listPending();
    res.json(rows);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No disponible' });
  }
};

/**
 * Obtiene el número total de reclamaciones pendientes
 * @param req Objeto Request de Express
 * @param res Objeto Response de Express
 */
export const getPendingClaimCount = async (_req: AuthedReq, res: Response) => {
  try {
    const count = await claimsService.getPendingCount();
    res.json({ count });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No disponible' });
  }
};

/**
 * Verifica y decide sobre una reclamación pendiente
 * @param req Objeto Request de Express que contiene la decisión y comentarios
 * @param res Objeto Response de Express
 * @requires Role.SUPERVISOR
 */
export const verifyClaim = async (req: AuthedReq, res: Response) => {
  try {
    if (!req.user?.id || req.user.role !== UserRole.SUPERVISOR) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    const { decision, comment } = VerifyClaimSchema.parse(req.body);
    const result = await claimsService.decideClaim({
      claimId: req.params.id,
      reviewerId: req.user.id,
      decision,
      comment,
    });
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No se pudo procesar la reclamación' });
  }
};