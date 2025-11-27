/**
 * Módulo de servicio de dashboard
 * Proporciona feed de actividad reciente del estudiante
 * @module back/services/dashboard
 */

import { AppDataSource } from '../data-source';
import { TestSession } from '../models/TestSession';
import { Question } from '../models/Question';
import { Claim } from '../models/Claim';

/** Tipo de item en el feed de actividad */
type FeedItem =
  | {
      kind: 'session';
      id: string;
      createdAt: string;
      completedAt: string | null;
      mode: 'learning' | 'exam' | 'errors';
      diagramTitle: string | null;
      totalQuestions: number;
      correctCount: number;
      score: number | null;
      durationSec: number | null;
    }
  | {
      kind: 'question';
      id: string;
      createdAt: string;
      status: 'pending' | 'approved' | 'rejected';
      title: string;
    }
  | {
      kind: 'claim';
      id: string;
      createdAt: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      title: string;
    };

/**
 * Obtiene actividad reciente del estudiante
 * Combina sesiones de test, preguntas creadas y reclamaciones
 * 
 * @param userId - ID del estudiante
 * @param limit - Número máximo de items a retornar
 * @param offset - Desplazamiento para paginación
 * @returns Feed ordenado por fecha descendente
 */
export async function getRecentActivity(userId: string, limit = 8, offset = 0): Promise<FeedItem[]> {
  const takeEach = Math.max(limit + offset, 40);

  const sessions = await AppDataSource.getRepository(TestSession)
    .createQueryBuilder('s')
    .innerJoin('s.user', 'u')
    .leftJoin('s.diagram', 'd')
    .where('u.id = :userId', { userId })
    .select([
      's.id AS id',
      's.mode AS mode',
      'd.title AS diagramTitle',
      's.totalQuestions AS totalQuestions',
      's.correctCount AS correctCount',
      's.score AS score',
      's.createdAt AS createdAt',
      's.completedAt AS completedAt',
      's.durationSeconds AS durationSec',
    ])
    .orderBy('s.createdAt', 'DESC')
    .limit(takeEach)
    .getRawMany<{
      id: string;
      mode: 'learning' | 'exam' | 'errors';
      diagramTitle: string | null;
      totalQuestions: number | null;
      correctCount: number | null;
      score: number | null;
      createdAt: Date | string;
      completedAt: Date | string | null;
      durationSec: number | null;
    }>();

  const sessionItems: FeedItem[] = sessions.map(s => ({
    kind: 'session',
    id: String(s.id),
    createdAt: (s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt)).toISOString(),
    completedAt: s.completedAt
      ? (s.completedAt instanceof Date ? s.completedAt : new Date(s.completedAt)).toISOString()
      : null,
    mode: s.mode,
    diagramTitle: s.diagramTitle ?? null,
    totalQuestions: Number(s.totalQuestions ?? 0),
    correctCount: Number(s.correctCount ?? 0),
    score: s.score != null ? Number(s.score) : null,
    durationSec: s.durationSec != null ? Number(s.durationSec) : null,
  }));

  const questions = await AppDataSource.getRepository(Question)
    .createQueryBuilder('q')
    .leftJoin('q.creator', 'qc')
    .where('qc.id = :userId', { userId })
    .select([
      'q.id AS id',
      'q.status AS status',
      'q.prompt AS prompt',
      'q.createdAt AS createdAt',
    ])
    .orderBy('q.createdAt', 'DESC')
    .limit(takeEach)
    .getRawMany<{ id: string; status: 'pending'|'approved'|'rejected'; prompt: string; createdAt: Date | string }>();

  const questionItems: FeedItem[] = questions.map(q => ({
    kind: 'question',
    id: String(q.id),
    createdAt: (q.createdAt instanceof Date ? q.createdAt : new Date(q.createdAt)).toISOString(),
    status: q.status,
    title: String(q.prompt ?? ''),
  }));

  const claims = await AppDataSource.getRepository(Claim)
    .createQueryBuilder('c')
    .innerJoin('c.student', 'stu')
    .where('stu.id = :userId', { userId })
    .select([
      'c.id AS id',
      'c.status AS status',
      'c.promptSnapshot AS promptSnapshot',
      'c.createdAt AS createdAt',
    ])
    .orderBy('c.createdAt', 'DESC')
    .limit(takeEach)
    .getRawMany<{ id: string; status: 'PENDING'|'APPROVED'|'REJECTED'; promptSnapshot: string; createdAt: Date | string }>();

  const claimItems: FeedItem[] = claims.map(c => ({
    kind: 'claim',
    id: String(c.id),
    createdAt: (c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)).toISOString(),
    status: c.status,
    title: String(c.promptSnapshot ?? ''),
  }));

  const all = [...sessionItems, ...questionItems, ...claimItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return all.slice(offset, offset + limit);
}