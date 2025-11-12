/**
 * Módulo de servicio de exámenes
 * Genera exámenes aleatorios con preguntas aprobadas
 * @module back/services/exams
 */

import { AppDataSource } from '../data-source';
import { Diagram } from '../models/Diagram';
import { Question, ReviewStatus } from '../models/Question';

/**
 * Servicio de exámenes
 * Gestiona la generación de tests aleatorios
 */
export class ExamsService {
  private diagramRepo = AppDataSource.getRepository(Diagram);

  /**
   * Genera un examen con diagrama aleatorio y preguntas aprobadas
   * @param limit - Número máximo de preguntas (default: 10)
   * @returns Diagrama y preguntas barajadas
   * @throws {Error} Si no hay diagramas o preguntas disponibles
   */
  async startRandomExam(limit = 10): Promise<{
    diagram: { id: string; title: string; path: string | null };
    questions: {
      id: string;
      prompt: string;
      options: string[];
      correctIndex: number;
      hint?: string;
    }[];
  }> {
    const rows = await this.diagramRepo
      .createQueryBuilder('d')
      .innerJoin('d.questions', 'q', 'q.status = :st', { st: ReviewStatus.APPROVED })
      .select('d.id', 'id')
      .groupBy('d.id')
      .getRawMany<{ id: string }>();

    if (!rows.length) throw new Error('No hay tests disponibles');

    const random = rows[Math.floor(Math.random() * rows.length)].id;

    const diagram = await this.diagramRepo.findOne({
      where: { id: random },
      relations: { questions: { options: true } },
    });
    if (!diagram) throw new Error('Test no encontrado');

    const approved = (diagram.questions || []).filter(
      (q) => q.status === ReviewStatus.APPROVED
    );
    if (!approved.length) throw new Error('El test no tiene preguntas aprobadas');

    const shuffled = approved
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(limit, approved.length));

    const questions = shuffled.map((q) => {
      const options = [...(q.options || [])]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((o) => o.text);

      let correctIndex = Number(q.correctOptionIndex ?? 0);
      if (!(correctIndex >= 0 && correctIndex < options.length)) {
        correctIndex = 0;
      }

      return {
        id: q.id,
        prompt: q.prompt,
        hint: q.hint || undefined,
        correctIndex,
        options,
      };
    });

    return {
      diagram: { id: diagram.id, title: diagram.title, path: diagram.path ?? null },
      questions,
    };
  }
}