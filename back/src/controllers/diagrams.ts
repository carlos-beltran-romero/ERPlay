/**
 * Módulo del controlador de diagramas
 * Gestiona las peticiones relacionadas con la gestión de diagramas ER
 * @module controllers/diagrams
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { createHttpError } from '../core/errors/HttpError';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { DiagramsService } from '../services/diagrams';

/**
 * Esquemas de validación para diagramas
 */
const QuestionSchema = z.object({
  prompt: z.string().min(1),
  hint: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
});

const BodySchema = z.object({
  title: z.string().min(1),
  questions: z.string().transform((value, ctx) => {
    try {
      const parsed = JSON.parse(value);
      const questions = z.array(QuestionSchema).parse(parsed);

      questions.forEach((question, index) => {
        if (question.correctIndex >= question.options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['questions', index, 'correctIndex'],
            message: 'correctIndex fuera de rango',
          });
        }
      });

      return questions;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'questions debe ser JSON válido' });
      return z.NEVER;
    }
  }),
});

const diagramsService = new DiagramsService();

/**
 * Funciones auxiliares para resolución de URLs
 */
const resolvePublicBase = (req: Request) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = req.get('host');
  return env.PUBLIC_API_BASE_URL ?? `${proto}://${host}`;
};

const resolvePath = (base: string, path: string) => (path.startsWith('http') ? path : `${base}${path}`);

/**
 * Lista todos los diagramas disponibles
 * @param req Objeto Request de Express
 * @param res Objeto Response de Express
 * @returns Lista de diagramas con sus metadatos
 */
export const listDiagrams = asyncHandler(async (req: Request, res: Response) => {
  const base = resolvePublicBase(req);
  const rows = await diagramsService.listDiagrams();
  res.json(
    rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      path: resolvePath(base, row.path),
      createdAt: row.createdAt,
      questionsCount: row.questionsCount ?? 0,
    })),
  );
});

/**
 * Obtiene un diagrama específico por su ID
 * @param req Objeto Request de Express con ID del diagrama
 * @param res Objeto Response de Express
 * @returns Datos completos del diagrama
 */
export const getDiagram = asyncHandler(async (req: Request, res: Response) => {
  const base = resolvePublicBase(req);
  const diagram = await diagramsService.getDiagramById(req.params.id);
  res.json({
    ...diagram,
    path: resolvePath(base, diagram.path),
  });
});

/**
 * Crea un nuevo diagrama con sus preguntas asociadas
 * @param req Objeto Request de Express con archivo de imagen y datos del diagrama
 * @param res Objeto Response de Express
 * @returns ID y ruta del nuevo diagrama
 */
export const createDiagram = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw createHttpError(400, 'Imagen requerida (campo "image")');
  }

  const { title, questions } = BodySchema.parse({ title: req.body.title, questions: req.body.questions });

  const result = await diagramsService.createDiagram({
    title,
    creatorId: req.user!.id,
    file: { filename: req.file.filename, path: req.file.path },
    questions: questions.map((question) => ({
      prompt: question.prompt,
      hint: question.hint,
      options: question.options,
      correctIndex: question.correctIndex,
    })),
  });

  res.status(201).json({ id: result.id, path: result.path });
});

/**
 * Actualiza un diagrama existente y sus preguntas
 * @param req Objeto Request de Express con ID del diagrama y nuevos datos
 * @param res Objeto Response de Express
 */
export const updateDiagram = asyncHandler(async (req: Request, res: Response) => {
  const { title, questions } = BodySchema.parse({ title: req.body.title, questions: req.body.questions });

  await diagramsService.updateDiagram({
    id: req.params.id,
    title,
    questions: questions.map((question) => ({
      prompt: question.prompt,
      hint: question.hint,
      options: question.options,
      correctIndex: question.correctIndex,
    })),
    newFile: req.file ? { filename: req.file.filename, path: req.file.path } : undefined,
    actorId: req.user!.id,
  });

  res.json({ message: 'Actualizado' });
});

/**
 * Elimina un diagrama específico
 * @param req Objeto Request de Express con ID del diagrama
 * @param res Objeto Response de Express
 */
export const deleteDiagram = asyncHandler(async (req: Request, res: Response) => {
  await diagramsService.deleteDiagram(req.params.id);
  res.sendStatus(204);
});

/**
 * Lista los diagramas públicamente disponibles
 * @param req Objeto Request de Express
 * @param res Objeto Response de Express
 * @returns Lista simplificada de diagramas
 */
export const listPublicDiagrams = asyncHandler(async (req: Request, res: Response) => {
  const base = resolvePublicBase(req);
  const rows = await diagramsService.listDiagrams();
  res.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      path: resolvePath(base, row.path),
    })),
  );
});