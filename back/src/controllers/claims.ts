import { Request, Response } from 'express';
import { z } from 'zod';
import { ClaimsService } from '../services/claims';
import { UserRole } from '../models/User';

type AuthUser = { id: string; role: UserRole; email?: string };
type AuthedReq = Request & { user?: AuthUser };

const svc = new ClaimsService();

/** Crear reclamación */
const CreateSchema = z.object({
  testResultId: z.string().uuid().optional().nullable(), // ⬅️ NUEVO
  questionId: z.string().uuid().optional().nullable(),
  diagramId: z.string().uuid(),
  prompt: z.string().min(1, 'El enunciado es obligatorio'),
  options: z.array(z.string().min(1)).min(2, 'Mínimo 2 opciones'),
  chosenIndex: z.number().int().nonnegative(),
  correctIndex: z.number().int().nonnegative(),
  explanation: z.string().min(5, 'La explicación es obligatoria'),
});

/** Verificar/decidir reclamación */
const VerifySchema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().max(2000).optional(),
});

export const createClaim = async (req: AuthedReq, res: Response) => {
  try {
    if (!req.user?.id || req.user.role !== UserRole.STUDENT) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    const input = CreateSchema.parse(req.body);

    const result = await svc.createClaim({
      studentId: req.user.id,
      testResultId: input.testResultId ?? null, // ⬅️ enlaza con TestResult si viene
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

export const listMyClaims = async (req: AuthedReq, res: Response) => {
  try {
    if (!req.user?.id || req.user.role !== UserRole.STUDENT) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    const rows = await svc.listMine(req.user.id);
    res.json(rows);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No se pudieron cargar tus reclamaciones' });
  }
};

/** Pendientes para revisión (puedes protegerlo si quieres con rol SUPERVISOR) */
export const listPendingClaims = async (_req: AuthedReq, res: Response) => {
  try {
    const rows = await svc.listPending();
    res.json(rows);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No disponible' });
  }
};

export const getPendingClaimCount = async (_req: AuthedReq, res: Response) => {
  try {
    const count = await svc.getPendingCount();
    res.json({ count });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No disponible' });
  }
};

export const verifyClaim = async (req: AuthedReq, res: Response) => {
  try {
    if (!req.user?.id || req.user.role !== UserRole.SUPERVISOR) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    const { decision, comment } = VerifySchema.parse(req.body);
    const result = await svc.decideClaim({
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
