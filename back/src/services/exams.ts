// src/services/exams.ts
import { AppDataSource } from '../data-source';
import { Diagram } from '../models/Diagram';
import { Question, ReviewStatus } from '../models/Question';

export class ExamsService {
  private diagramRepo = AppDataSource.getRepository(Diagram);

  /**
   * Devuelve un examen con un diagrama aleatorio y hasta `limit` preguntas aprobadas.
   */
  async startRandomExam(limit = 10): Promise<{
    diagram: { id: string; title: string; path: string | null };
    questions: {
      id: string;                      // 👈 NECESARIO para poder reclamar
      prompt: string;
      options: string[];
      correctIndex: number;
      hint?: string;
    }[];
  }> {
    // 1) Obtener IDs de diagramas que tengan preguntas aprobadas
    const rows = await this.diagramRepo
      .createQueryBuilder('d')
      .innerJoin('d.questions', 'q', 'q.status = :st', { st: ReviewStatus.APPROVED })
      .select('d.id', 'id')
      .groupBy('d.id')
      .getRawMany<{ id: string }>();

    if (!rows.length) {
      throw new Error('No hay tests disponibles');
    }

    // 2) Elegir uno al azar
    const random = rows[Math.floor(Math.random() * rows.length)].id;

    // 3) Cargar el diagrama con sus preguntas+opciones y filtrar aprobadas en memoria
    const diagram = await this.diagramRepo.findOne({
      where: { id: random },
      relations: { questions: { options: true } },
    });
    if (!diagram) throw new Error('Test no encontrado');

    const approved = (diagram.questions || []).filter(
      (q) => q.status === ReviewStatus.APPROVED
    );
    if (!approved.length) {
      throw new Error('El test no tiene preguntas aprobadas');
    }

    // 4) Barajar preguntas y cortar a 'limit'
    const shuffled = approved
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(limit, approved.length));

    const questions = shuffled.map((q) => {
      const options = [...(q.options || [])]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((o) => o.text);

      let correctIndex = Number(q.correctOptionIndex ?? 0);
      if (!(correctIndex >= 0 && correctIndex < options.length)) {
        correctIndex = 0; // fallback defensivo
      }

      return {
        id: q.id,                       // 👈 ahora viaja al front
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
