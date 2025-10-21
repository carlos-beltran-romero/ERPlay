import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DiagramsService } from '../services/diagrams';

const QuestionZ = z.object({
  prompt: z.string().min(1),
  hint: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
});

const BodyZ = z.object({
  title: z.string().min(1),
  questions: z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      const arr = z.array(QuestionZ).parse(parsed);
      arr.forEach((q, i) => {
        if (q.correctIndex >= q.options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['questions', i, 'correctIndex'],
            message: 'correctIndex fuera de rango',
          });
        }
      });
      return arr;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'questions debe ser JSON válido' });
      return z.NEVER;
    }
  }),
});

const serviceBaseUrl = (req: Request) => {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.get('host');
    const base = process.env.PUBLIC_API_BASE_URL || `${proto}://${host}`;
    return base;
  };

const service = new DiagramsService();

// GET /api/diagrams
export const listDiagrams = async (req, res) => {
    try {
      const base = serviceBaseUrl(req);
      const rows = await service.listDiagrams();
      res.json(rows.map(r => ({
        id: r.id,
        title: r.title,
        path: r.path.startsWith('http') ? r.path : `${base}${r.path}`, // 👈
        createdAt: r.createdAt,
        questionsCount: (r as any).questionsCount ?? 0,
      })));
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'No se pudo listar' });
    }
  };

// GET /api/diagrams/:id
export const getDiagram = async (req, res) => {
    try {
      const base = serviceBaseUrl(req);
      const d = await service.getDiagramById(req.params.id);
      res.json({
        ...d,
        path: d.path.startsWith('http') ? d.path : `${base}${d.path}`, // 👈
      });
    } catch (err: any) {
      res.status(404).json({ error: err.message || 'No encontrado' });
    }
  };

// POST /api/diagrams  (crear)
export const createDiagram = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Imagen requerida (campo "image")' });
      return;
    }
    const { title, questions } = BodyZ.parse({
      title: req.body.title,
      questions: req.body.questions,
    });

    const result = await service.createDiagram({
      title,
      creatorId: req.user!.id,
      file: { filename: req.file.filename, path: req.file.path },
      questions: questions.map(q => ({
        prompt: q.prompt,
        hint: q.hint,
        options: q.options,
        correctIndex: q.correctIndex,
      })),
    });

    res.status(201).json({ id: result.id, path: result.path });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Datos inválidos' });
  }
};

// PUT /api/diagrams/:id  (actualizar)
export const updateDiagram = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, questions } = BodyZ.parse({
      title: req.body.title,
      questions: req.body.questions,
    });

    await service.updateDiagram({
      id: req.params.id,
      title,
      questions: questions.map(q => ({
        prompt: q.prompt,
        hint: q.hint,
        options: q.options,
        correctIndex: q.correctIndex,
      })),
      newFile: req.file ? { filename: req.file.filename, path: req.file.path } : undefined,
      actorId: req.user!.id, // 👈 PASAMOS QUIÉN EDITA
    });

    res.json({ message: 'Actualizado' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'No se pudo actualizar' });
  }
};

// DELETE /api/diagrams/:id
export const deleteDiagram = async (req: Request, res: Response): Promise<void> => {
  try {
    await service.deleteDiagram(req.params.id);
    res.sendStatus(204);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'No se pudo eliminar' });
  }
};

// --- NUEVO: listar diagramas para selector (alumno/supervisor) ---
export const listPublicDiagrams = async (req: Request, res: Response) => {
  try {
    const base = ((req.headers['x-forwarded-proto'] as string) || req.protocol) + '://' + req.get('host');
    const rows = await service.listDiagrams();
    res.json(rows.map(r => ({
      id: r.id,
      title: r.title,
      path: r.path?.startsWith('http') ? r.path : `${base}${r.path}`,
    })));
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'No se pudieron listar los diagramas' });
  }
};
