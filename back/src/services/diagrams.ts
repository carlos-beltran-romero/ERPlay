// src/services/diagrams.service.ts
import { AppDataSource } from '../data-source';
import { Diagram } from '../models/Diagram';
import { Question, ReviewStatus } from '../models/Question';
import { Option } from '../models/Option';
import { User, UserRole } from '../models/User';
import fs from 'fs';
import path from 'path';

export type QuestionInput = {
  prompt: string;
  hint: string;
  options: string[];     // >= 2
  correctIndex: number;  // 0..n-1
};

export class DiagramsService {
  private diagramRepo = AppDataSource.getRepository(Diagram);
  private questionRepo = AppDataSource.getRepository(Question);
  private optionRepo = AppDataSource.getRepository(Option);
  private userRepo = AppDataSource.getRepository(User);

  async createDiagram(params: {
    title: string;
    creatorId: string;
    file: { filename: string; path: string };
    questions: QuestionInput[];
  }): Promise<{ id: string; path: string }> {
    const creator = await this.userRepo.findOneByOrFail({ id: params.creatorId });

    // Validaciones mínimas
    if (!params.title.trim()) throw new Error('Título requerido');
    if (!params.questions || params.questions.length === 0) throw new Error('Debes incluir al menos 1 pregunta');
    for (const q of params.questions) {
      if (!q.prompt?.trim()) throw new Error('Cada pregunta debe tener enunciado');
      if (!q.hint?.trim()) throw new Error('Cada pregunta debe tener pista');
      if (!Array.isArray(q.options) || q.options.length < 2) throw new Error('Cada pregunta requiere ≥ 2 opciones');
      if (q.options.some(o => !o || !o.trim())) throw new Error('Las opciones no pueden estar vacías');
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) throw new Error('Índice de opción correcta inválido');
    }

    // Transacción
    return AppDataSource.transaction(async (manager) => {
      const diagram = manager.create(Diagram, {
        title: params.title.trim(),
        filename: params.file.filename,
        path: `/uploads/diagrams/${params.file.filename}`,
        creator, // si tu modelo Diagram tiene creator
      });
      await manager.save(diagram);

      const supervisor = creator.role === UserRole.SUPERVISOR;

      for (const q of params.questions) {
        const question = manager.create(Question, {
          prompt: q.prompt.trim(),
          hint: q.hint.trim(),
          correctOptionIndex: q.correctIndex,
          diagram,
          creator: creator, // marca autor
          status: supervisor ? ReviewStatus.APPROVED : ReviewStatus.PENDING,
          reviewedBy: supervisor ? creator : null,
          reviewedAt: supervisor ? new Date() : null,
          reviewComment: null,
        });
        await manager.save(question);

        const options = q.options.map((text, idx) =>
          manager.create(Option, { text: text.trim(), orderIndex: idx, question })
        );
        await manager.save(options);
      }

      return { id: diagram.id, path: diagram.path };
    });
  }


  async listDiagrams(): Promise<(Diagram & { questionsCount: number })[]> {
    const qb = this.diagramRepo.createQueryBuilder('d')
      .loadRelationCountAndMap('d.questionsCount', 'd.questions')
      .orderBy('d.createdAt', 'DESC');

    const rows = await qb.getMany() as (Diagram & { questionsCount: number })[];
    return rows;
  }

  async getDiagramById(id: string): Promise<{
    id: string;
    title: string;
    path: string;
    createdAt: Date;
    questions: { prompt: string; hint: string; correctIndex: number; options: string[] }[];
  }> {
    const diagram = await this.diagramRepo.findOne({
      where: { id },
      relations: { questions: { options: true } },
    });
    if (!diagram) throw new Error('Test no encontrado');

    const questions = (diagram.questions || [])
      .map(q => ({
        prompt: q.prompt,
        hint: q.hint,
        correctIndex: q.correctOptionIndex,
        options: [...(q.options || [])].sort((a, b) => a.orderIndex - b.orderIndex).map(o => o.text),
      }));

    return {
      id: diagram.id,
      title: diagram.title,
      path: diagram.path,
      createdAt: diagram.createdAt,
      questions,
    };
  }

  // -------------------
  // UPDATE (imagen opcional)
  // -------------------
  async updateDiagram(params: {
    id: string;
    title: string;
    questions: QuestionInput[];
    newFile?: { filename: string; path: string };
    actorId: string; // 👈 QUIÉN EDITA
  }): Promise<void> {
    // validaciones...

    let oldPublicPath: string | null = null;

    await AppDataSource.transaction(async (manager) => {
      const diagram = await manager.findOneBy(Diagram, { id: params.id });
      if (!diagram) throw new Error('Test no encontrado');

      const actor = await manager.findOneBy(User, { id: params.actorId });
      if (!actor) throw new Error('Usuario no encontrado');
      const supervisor = actor.role === UserRole.SUPERVISOR;

      // actualizar título/imagen
      oldPublicPath = params.newFile ? diagram.path : null;
      diagram.title = params.title.trim();
      if (params.newFile) {
        diagram.filename = params.newFile.filename;
        diagram.path = `/uploads/diagrams/${params.newFile.filename}`;
      }
      await manager.save(diagram);

      // borrar preguntas/opciones actuales
      const existingQs = await manager.find(Question, {
        where: { diagram: { id: diagram.id } },
        relations: { options: true },
      });
      for (const q of existingQs) {
        if (q.options?.length) await manager.remove(Option, q.options);
      }
      if (existingQs.length) await manager.remove(Question, existingQs);

      // recrear preguntas APROBADAS si edita un supervisor
      for (const q of params.questions) {
        const question = manager.create(Question, {
          prompt: q.prompt.trim(),
          hint: q.hint.trim(),
          correctOptionIndex: q.correctIndex,
          diagram,
          creator: actor, // autor de la edición
          status: supervisor ? ReviewStatus.APPROVED : ReviewStatus.PENDING,
          reviewedBy: supervisor ? actor : null,
          reviewedAt: supervisor ? new Date() : null,
          reviewComment: null,
        });
        await manager.save(question);

        const options = q.options.map((text, idx) =>
          manager.create(Option, { text: text.trim(), orderIndex: idx, question })
        );
        await manager.save(options);
      }
    });

    if (oldPublicPath) {
      const absolute = path.resolve(oldPublicPath.replace(/^\/+/, ''));
      fs.unlink(absolute, () => {});
    }
  }

  // -------------------
  // DELETE
  // -------------------
  async deleteDiagram(id: string): Promise<void> {
    let oldPublicPath: string | null = null;

    await AppDataSource.transaction(async (manager) => {
      const diagram = await manager.findOneBy(Diagram, { id });
      if (!diagram) throw new Error('Test no encontrado');

      oldPublicPath = diagram.path;
      await manager.remove(Diagram, diagram); // cascade borra preguntas/opciones
    });

    if (oldPublicPath) {
      const absolute = path.resolve(oldPublicPath.replace(/^\/+/, ''));
      fs.unlink(absolute, () => {/* ignore */});
    }
  }




}
