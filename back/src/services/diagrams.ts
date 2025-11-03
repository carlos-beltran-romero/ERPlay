import fs from 'node:fs/promises';
import path from 'node:path';
import { AppDataSource } from '../data-source';
import { Diagram } from '../models/Diagram';
import { Option } from '../models/Option';
import { Question, QuestionSource, ReviewStatus } from '../models/Question';
import { User, UserRole } from '../models/User';

export type QuestionInput = {
  id?: string;
  prompt: string;
  hint: string;
  options: string[];
  correctIndex: number;
};

type NormalizedQuestion = Required<Omit<QuestionInput, 'id'>> & {
  id?: string;
};

function normalizeQuestion(raw: QuestionInput, index: number): NormalizedQuestion {
  const prompt = raw.prompt?.trim() ?? '';
  const hint = raw.hint?.trim() ?? '';
  const options = Array.isArray(raw.options) ? raw.options.map((option) => option?.trim() ?? '') : [];
  const correctIndex = raw.correctIndex;

  if (!prompt) {
    throw new Error(`Pregunta ${index + 1}: el enunciado es obligatorio`);
  }
  if (!hint) {
    throw new Error(`Pregunta ${index + 1}: la pista es obligatoria`);
  }
  if (options.length < 2) {
    throw new Error(`Pregunta ${index + 1}: mínimo dos opciones`);
  }
  if (options.some((option) => !option)) {
    throw new Error(`Pregunta ${index + 1}: las opciones no pueden estar vacías`);
  }
  if (correctIndex < 0 || correctIndex >= options.length) {
    throw new Error(`Pregunta ${index + 1}: índice de opción correcta inválido`);
  }

  return {
    id: raw.id,
    prompt,
    hint,
    options,
    correctIndex,
  };
}

function resolveUploadPath(publicPath: string): string {
  const relative = publicPath.replace(/^\/+/, '');
  const safePath = relative.startsWith('uploads') ? relative : path.join('uploads', relative);
  return path.resolve(safePath);
}

export class DiagramsService {
  private readonly diagramRepo = AppDataSource.getRepository(Diagram);

  private readonly questionRepo = AppDataSource.getRepository(Question);

  private readonly userRepo = AppDataSource.getRepository(User);

  async createDiagram(params: {
    title: string;
    creatorId: string;
    file: { filename: string; path: string };
    questions: QuestionInput[];
  }): Promise<{ id: string; path: string }> {
    const creator = await this.userRepo.findOneByOrFail({ id: params.creatorId });
    if (!params.questions || params.questions.length === 0) {
      throw new Error('Debes incluir al menos una pregunta');
    }
    const questions = params.questions.map((q, index) => normalizeQuestion(q, index));

    if (!params.title?.trim()) {
      throw new Error('El título es obligatorio');
    }

    return AppDataSource.transaction(async (manager) => {
      const diagram = manager.create(Diagram, {
        title: params.title.trim(),
        filename: params.file.filename,
        path: `/uploads/diagrams/${params.file.filename}`,
        creator,
      });
      await manager.save(diagram);

      const supervisor = creator.role === UserRole.SUPERVISOR;
      const source = supervisor ? QuestionSource.CATALOG : QuestionSource.STUDENT;

      for (const questionInput of questions) {
        const question = manager.create(Question, {
          prompt: questionInput.prompt,
          hint: questionInput.hint,
          correctOptionIndex: questionInput.correctIndex,
          diagram,
          creator,
          source,
          status: supervisor ? ReviewStatus.APPROVED : ReviewStatus.PENDING,
          reviewedBy: supervisor ? creator : null,
          reviewedAt: supervisor ? new Date() : null,
          reviewComment: null,
        });
        await manager.save(question);

        const options = questionInput.options.map((text, orderIndex) =>
          manager.create(Option, { text, orderIndex, question })
        );
        await manager.save(options);
      }

      return { id: diagram.id, path: diagram.path };
    });
  }

  async listDiagrams(): Promise<Array<Diagram & { questionsCount: number }>> {
    const rows = await this.diagramRepo
      .createQueryBuilder('diagram')
      .loadRelationCountAndMap(
        'diagram.questionsCount',
        'diagram.questions',
        'question',
        (qb) => qb.where('question.status = :status', { status: ReviewStatus.APPROVED })
      )
      .orderBy('diagram.createdAt', 'DESC')
      .getMany();

    return rows as Array<Diagram & { questionsCount: number }>;
  }

  async getDiagramById(id: string): Promise<{
    id: string;
    title: string;
    path: string;
    createdAt: Date;
    questions: Array<{
      id: string;
      prompt: string;
      hint: string;
      correctIndex: number;
      options: string[];
      source: QuestionSource;
    }>;
  }> {
    const diagram = await this.diagramRepo.findOne({ where: { id } });
    if (!diagram) {
      throw new Error('Diagrama no encontrado');
    }

    const approvedQuestions = await this.questionRepo.find({
      where: { diagram: { id: diagram.id }, status: ReviewStatus.APPROVED },
      relations: { options: true },
      order: { createdAt: 'ASC' },
    });

    const questions = approvedQuestions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      hint: question.hint,
      correctIndex: question.correctOptionIndex,
      options: (question.options ?? [])
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((option) => option.text),
      source: question.source,
    }));

    return {
      id: diagram.id,
      title: diagram.title,
      path: diagram.path,
      createdAt: diagram.createdAt,
      questions,
    };
  }

  async updateDiagram(params: {
    id: string;
    title: string;
    questions: QuestionInput[];
    newFile?: { filename: string; path: string };
    actorId: string;
  }): Promise<void> {
    if (!params.title?.trim()) {
      throw new Error('El título es obligatorio');
    }

    const normalizedQuestions = params.questions.map((question, index) => normalizeQuestion(question, index));

    let previousPath: string | null = null;

    await AppDataSource.transaction(async (manager) => {
      const diagram = await manager.findOne(Diagram, {
        where: { id: params.id },
        relations: { creator: true },
      });
      if (!diagram) {
        throw new Error('Diagrama no encontrado');
      }

      const actor = await manager.findOne(User, { where: { id: params.actorId } });
      if (!actor) {
        throw new Error('Usuario no encontrado');
      }

      const existingQuestions = await manager.find(Question, {
        where: { diagram: { id: diagram.id } },
        relations: { options: true, creator: true },
        order: { createdAt: 'ASC' },
      });

      const supervisor = actor.role === UserRole.SUPERVISOR;

      diagram.title = params.title.trim();
      if (params.newFile) {
        previousPath = diagram.path;
        diagram.filename = params.newFile.filename;
        diagram.path = `/uploads/diagrams/${params.newFile.filename}`;
      }
      await manager.save(diagram);

      const catalogQuestions = existingQuestions.filter((question) => question.source === QuestionSource.CATALOG);
      const catalogById = new Map(catalogQuestions.map((question) => [question.id, question] as const));

      const payloadById = new Map(
        normalizedQuestions
          .filter((question) => question.id)
          .map((question) => [question.id as string, question])
      );

      const idsToRemove = catalogQuestions
        .filter((question) => !payloadById.has(question.id))
        .map((question) => question.id);

      if (idsToRemove.length > 0) {
        const optionsToDelete = catalogQuestions
          .filter((question) => idsToRemove.includes(question.id))
          .flatMap((question) => question.options ?? []);
        if (optionsToDelete.length > 0) {
          await manager.remove(Option, optionsToDelete);
        }
        const questionsToDelete = catalogQuestions.filter((question) => idsToRemove.includes(question.id));
        await manager.remove(Question, questionsToDelete);
      }

      for (const [questionId, payload] of payloadById) {
        const existing = catalogById.get(questionId);
        if (!existing) {
          continue;
        }

        existing.prompt = payload.prompt;
        existing.hint = payload.hint;
        existing.correctOptionIndex = payload.correctIndex;
        existing.creator = actor;
        existing.source = QuestionSource.CATALOG;
        existing.status = supervisor ? ReviewStatus.APPROVED : ReviewStatus.PENDING;
        existing.reviewComment = null;
        existing.reviewedBy = supervisor ? actor : null;
        existing.reviewedAt = supervisor ? new Date() : null;

        if (existing.options?.length) {
          await manager.remove(Option, existing.options);
        }

        const newOptions = payload.options.map((text, orderIndex) =>
          manager.create(Option, { text, orderIndex, question: existing })
        );
        await manager.save(newOptions);
        await manager.save(existing);
      }

      const newQuestions = normalizedQuestions.filter((question) => !question.id);
      for (const payload of newQuestions) {
        const question = manager.create(Question, {
          prompt: payload.prompt,
          hint: payload.hint,
          correctOptionIndex: payload.correctIndex,
          diagram,
          creator: actor,
          source: QuestionSource.CATALOG,
          status: supervisor ? ReviewStatus.APPROVED : ReviewStatus.PENDING,
          reviewedBy: supervisor ? actor : null,
          reviewedAt: supervisor ? new Date() : null,
          reviewComment: null,
        });
        await manager.save(question);

        const options = payload.options.map((text, orderIndex) =>
          manager.create(Option, { text, orderIndex, question })
        );
        await manager.save(options);
      }
    });

    if (previousPath) {
      const absolute = resolveUploadPath(previousPath);
      await fs.unlink(absolute).catch(() => undefined);
    }
  }

  async deleteDiagram(id: string): Promise<void> {
    let previousPath: string | null = null;

    await AppDataSource.transaction(async (manager) => {
      const diagram = await manager.findOneBy(Diagram, { id });
      if (!diagram) {
        throw new Error('Diagrama no encontrado');
      }

      previousPath = diagram.path;
      await manager.remove(Diagram, diagram);
    });

    if (previousPath) {
      const absolute = resolveUploadPath(previousPath);
      await fs.unlink(absolute).catch(() => undefined);
    }
  }
}
