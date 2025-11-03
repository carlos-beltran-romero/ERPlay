import { apiJson } from './http';

export type RecentActivityItem =
  | {
      kind: 'session';
      id: string;
      createdAt: string;
      completedAt: string | null;
      mode: 'learning' | 'exam' | 'errors';
      diagramTitle: string | null;
      totalQuestions: number;
      correctCount: number;
      score: number | null;      // 0..10 si aplica
      durationSec: number | null;
    }
  | {
      kind: 'question';
      id: string;
      createdAt: string;
      status: 'pending' | 'approved' | 'rejected';
      title: string; // preview del prompt
    }
  | {
      kind: 'claim';
      id: string;
      createdAt: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      title: string; // preview del promptSnapshot
    };

export async function getRecentActivity(params?: { limit?: number; offset?: number }) {
  const limit = params?.limit ?? 8;
  const offset = params?.offset ?? 0;

  const data = await apiJson<unknown>(`/api/dashboard/recent?limit=${limit}&offset=${offset}`, {
    auth: true,
    fallbackError: 'No se pudo cargar la actividad reciente',
  });

  if (!Array.isArray(data)) {
    throw new Error('Respuesta inesperada de la API');
  }
  return data as RecentActivityItem[];
}
