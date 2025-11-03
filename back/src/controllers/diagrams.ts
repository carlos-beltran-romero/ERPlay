import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { DiagramsService } from '../services/diagrams';

const QuestionSchema = z
  .object({
    id: z.string().uuid().optional(),
    prompt: z.string().min(1),
    hint: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correctIndex: z.number().int().min(0),
  })
  .superRefine((question, ctx) => {
    if (question.correctIndex >= question.options.length) {
      ctx.addIssue({
        path: ['correctIndex'],
        code: z.ZodIssueCode.custom,
        message: 'Índice de opción correcta fuera de rango',
      });
    }
  });

const QuestionsFieldSchema = z.preprocess((value, ctx) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'questions debe ser JSON válido' });
      return z.NEVER;
    }
  }
  return value;
}, z.array(QuestionSchema));

const BodySchema = z.object({
  title: z.string().min(1),
  questions: QuestionsFieldSchema,
});

const diagramsService = new DiagramsService();

const serviceBaseUrl = (req: Request): string => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = req.get('host');
  return process.env.PUBLIC_API_BASE_URL || `${proto}://${host}`;
};

export const listDiagrams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const base = serviceBaseUrl(req);
    const diagrams = await diagramsService.listDiagrams();
    res.json(
      diagrams.map((diagram) => ({
        id: diagram.id,
        title: diagram.title,
        createdAt: diagram.createdAt,
        path: diagram.path.startsWith('http') ? diagram.path : `${base}${diagram.path}`,
        questionsCount: (diagram as unknown as { questionsCount?: number }).questionsCount ?? 0,
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const getDiagram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const base = serviceBaseUrl(req);
    const diagram = await diagramsService.getDiagramById(req.params.id);
    res.json({
      ...diagram,
      path: diagram.path.startsWith('http') ? diagram.path : `${base}${diagram.path}`,
    });
  } catch (error) {
    next(error);
  }
};

export const createDiagram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Imagen requerida (campo "image")' });
      return;
    }

    const { title, questions } = BodySchema.parse({
      title: req.body.title,
      questions: req.body.questions,
    });

    const result = await diagramsService.createDiagram({
      title,
      creatorId: req.user!.id,
      file: { filename: req.file.filename, path: req.file.path },
      questions,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateDiagram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, questions } = BodySchema.parse({
      title: req.body.title,
      questions: req.body.questions,
    });

    await diagramsService.updateDiagram({
      id: req.params.id,
      title,
      questions,
      newFile: req.file ? { filename: req.file.filename, path: req.file.path } : undefined,
      actorId: req.user!.id,
    });

    res.json({ message: 'Actualizado' });
  } catch (error) {
    next(error);
  }
};

export const deleteDiagram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await diagramsService.deleteDiagram(req.params.id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};

export const listPublicDiagrams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const base = serviceBaseUrl(req);
    const diagrams = await diagramsService.listDiagrams();
    res.json(
      diagrams.map((diagram) => ({
        id: diagram.id,
        title: diagram.title,
        path: diagram.path.startsWith('http') ? diagram.path : `${base}${diagram.path}`,
      }))
    );
  } catch (error) {
    next(error);
  }
};
