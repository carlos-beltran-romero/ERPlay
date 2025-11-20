/**
 * Módulo de servicio de exámenes
 * Genera exámenes aleatorios con preguntas aprobadas
 * @module back/services/exams
 */

import { AppDataSource } from '../data-source';
import { Diagram } from '../models/Diagram';
import { Question, ReviewStatus } from '../models/Question';
import { Claim, ClaimStatus } from '../models/Claim';

/**
 * Servicio de exámenes
 * Gestiona la generación de tests aleatorios
 */
export class ExamsService {
  private diagramRepo = AppDataSource.getRepository(Diagram);
  private claimRepo = AppDataSource.getRepository(Claim);

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
      .leftJoin(Claim, 'c', 'c.question_id = q.id AND c.status = :pending', {
        pending: ClaimStatus.PENDING,
      })
      .select('DISTINCT d.id', 'id')
      .groupBy('d.id')
      .addGroupBy('q.id')
      .having('COUNT(c.id) < 1')
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

    const pendingMap = new Map<string, number>();
    if (approved.length) {
      const rows = await this.claimRepo
        .createQueryBuilder('c')
        .select('c.question_id', 'qid')
        .addSelect('COUNT(*)', 'pending')
        .where('c.status = :st', { st: ClaimStatus.PENDING })
        .andWhere('c.question_id IN (:...ids)', { ids: approved.map((q) => q.id) })
        .groupBy('c.question_id')
        .getRawMany<{ qid: string; pending: string }>();

      rows.forEach((r) => pendingMap.set(r.qid, Number(r.pending ?? 0)));
    }

    const eligible = approved.filter((q) => (pendingMap.get(q.id) ?? 0) < 1);
    if (!eligible.length) throw new Error('El test no tiene preguntas disponibles');

    const shuffled = eligible
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(limit, eligible.length));

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