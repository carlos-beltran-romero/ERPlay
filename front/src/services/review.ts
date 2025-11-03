import { apiJson } from './http';

export async function getPendingStudentQuestionsCount(): Promise<number> {
  try {
    const data = await apiJson<any>('/api/questions/pending/count', {
      auth: true,
      fallbackError: 'No disponible',
    });
    return Number(data?.count ?? 0);
  } catch {
    return 0;
  }
}
