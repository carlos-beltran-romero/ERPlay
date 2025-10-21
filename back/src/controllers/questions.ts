// src/controllers/questions.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { QuestionsService } from '../services/questions';
import { UserRole } from '../models/User';

// ==== Tipos para el usuario autenticado en req.user ====
type AuthUser = {
  id: string;
  role: UserRole;           // 👈 usamos el enum del modelo para evitar conflictos
  email?: string;
  name?: string | null;
};

// Request extendido con user
type AuthenticatedRequest = Request & { user?: AuthUser };

// ==== Instancia del servicio ====
const svc = new QuestionsService();

// ==== Schemas de validación ====
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

// ===================== Controladores =====================

// POST /api/questions
export const createQuestion = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const body = CreateSchema.parse(req.body);
    if (!req.user?.id) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const result = await svc.createQuestion({
      diagramId: body.diagramId,
      prompt: body.prompt,
      hint: body.hint,
      options: body.options,
      correctIndex: body.correctIndex,
      creatorId: req.user.id,
    });

    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Datos inválidos' });
  }
};

// GET /api/questions/pending/count
export const getPendingCount = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const count = await svc.getPendingCount();
    res.json({ count });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No disponible' });
  }
};

// GET /api/questions/pending
export const listPending = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const rows = await svc.listPending();
    res.json(rows);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No disponible' });
  }
};

// POST /api/questions/:id/verify
export const verifyQuestion = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { decision, comment } = VerifySchema.parse(req.body);
    if (!req.user?.id) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    await svc.verifyQuestion({
      questionId: req.params.id,
      reviewerId: req.user.id,
      decision,
      comment,
    });

    res.json({ message: 'Revisión aplicada' });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No se pudo verificar' });
  }
};

// ===================== Helper para URL pública de imágenes =====================
const serviceBaseUrl = (req: Request) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = req.get('host');
  const base = process.env.PUBLIC_API_BASE_URL || `${proto}://${host}`;
  return base;
};

// ===================== GET /api/questions/mine =====================
// Lista las preguntas creadas por el usuario autenticado, con datos del diagrama.
// src/controllers/questions.ts
import { AppDataSource } from '../data-source';
import { Question } from '../models/Question';

// ===================== GET /api/questions/mine =====================
export const listMine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const base = serviceBaseUrl(req);

    // ✅ Traemos SIEMPRE las opciones desde la BD
    const repo = AppDataSource.getRepository(Question);
    const rows = await repo.find({
      where: { creator: { id: req.user.id } },
      relations: { diagram: true, options: true },
      order: { createdAt: 'DESC' },
    });

    const out = rows.map((r) => {
      const options = (r.options ?? [])
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((o) => o.text);

      return {
        id: r.id,
        prompt: r.prompt,
        status: r.status,
        reviewComment: r.reviewComment ?? null,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt ?? null,
        diagram: r.diagram
          ? {
              id: r.diagram.id,
              title: r.diagram.title,
              path: r.diagram.path
                ? (r.diagram.path.startsWith('http') ? r.diagram.path : `${base}${r.diagram.path}`)
                : undefined,
            }
          : undefined,
        options,                               // ✅ ahora es string[]
        correctIndex: r.correctOptionIndex ?? 0,
      };
    });

    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'No se pudieron listar tus preguntas' });
  }
};


