/**
 * @module controllers/questions
 */
import { Request, Response } from 'express';
import { z } from 'zod';

import { env } from '../config/env';
import { createHttpError } from '../core/errors/HttpError';
import { AppDataSource } from '../data-source';
import { Question } from '../models/Question';
import { UserRole } from '../models/User';
import { QuestionsService } from '../services/questions';
import { asyncHandler } from '../utils/asyncHandler';

const CreateSchema = z.object({
  diagramId: z.string().uuid(),
  prompt: z.string().min(1, 'El enunciado es obligatorio'),
  hint: z.string().min(1, 'La pista es obligatoria'),
  options: z.array(z.string().min(1)).min(2, 'Mínimo 2 opciones'),
  correctIndex: z.number().int().min(0),
});

const VerifySchema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().max(1000).optional(),
});

const questionsService = new QuestionsService();

const ensureAuthenticated = (req: Request) => {
  if (!req.user?.id) {
    throw createHttpError(401, 'No autenticado');
  }

  return req.user;
};

const getPublicBase = (req: Request) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = req.get('host');
  return env.PUBLIC_API_BASE_URL ?? `${proto}://${host}`;
};

export const createQuestion = asyncHandler(async (req: Request, res: Response) => {
  const user = ensureAuthenticated(req);
  const payload = CreateSchema.parse(req.body);

  const result = await questionsService.createQuestion({
    diagramId: payload.diagramId,
    prompt: payload.prompt,
    hint: payload.hint,
    options: payload.options,
    correctIndex: payload.correctIndex,
    creatorId: user.id,
  });

  res.status(201).json(result);
});

export const getPendingCount = asyncHandler(async (_req: Request, res: Response) => {
  const count = await questionsService.getPendingCount();
  res.json({ count });
});

export const listPending = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await questionsService.listPending();
  res.json(rows);
});

export const verifyQuestion = asyncHandler(async (req: Request, res: Response) => {
  const user = ensureAuthenticated(req);
  if (user.role !== UserRole.SUPERVISOR) {
    throw createHttpError(403, 'No autorizado');
  }

  const { decision, comment } = VerifySchema.parse(req.body);

  await questionsService.verifyQuestion({
    questionId: req.params.id,
    reviewerId: user.id,
    decision,
    comment,
  });

  res.json({ message: 'Revisión aplicada' });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const user = ensureAuthenticated(req);
  const base = getPublicBase(req);

  const repo = AppDataSource.getRepository(Question);
  const rows = await repo.find({
    where: { creator: { id: user.id } },
    relations: { diagram: true, options: true },
    order: { createdAt: 'DESC' },
  });

  const output = rows.map((row) => {
    const options = (row.options ?? [])
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((option) => option.text);

    return {
      id: row.id,
      prompt: row.prompt,
      status: row.status,
      reviewComment: row.reviewComment ?? null,
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt ?? null,
      diagram: row.diagram
        ? {
            id: row.diagram.id,
            title: row.diagram.title,
            path: row.diagram.path
              ? row.diagram.path.startsWith('http')
                ? row.diagram.path
                : `${base}${row.diagram.path}`
              : undefined,
          }
        : undefined,
      options,
      correctIndex: row.correctOptionIndex ?? 0,
    };
  });

  res.json(output);
});
