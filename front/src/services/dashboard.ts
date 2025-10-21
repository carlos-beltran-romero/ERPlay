// src/services/dashboard.ts
const API_URL = import.meta.env.VITE_API_URL as string;

function getAccessToken(): string | null {
  return (
    sessionStorage.getItem('accessToken') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('jwt') ||
    localStorage.getItem('jwt') ||
    null
  );
}
function auth() {
  const t = getAccessToken();
  if (!t) throw new Error('No autenticado');
  return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
}

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
      const res = await fetch(`${API_URL}/api/dashboard/recent?limit=${limit}&offset=${offset}`, { headers: auth() });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data as any)?.error || `Error ${res.status}`);
      }
      if (!Array.isArray(data)) {
        throw new Error('Respuesta inesperada de la API');
      }
      return data as RecentActivityItem[];
    }
