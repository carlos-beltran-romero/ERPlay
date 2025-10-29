// src/services/review.ts
import { fetchAuth, API_URL } from './http';

export async function getPendingStudentQuestionsCount(): Promise<number> {
  try {
    const res = await fetchAuth(`${API_URL}/api/questions/pending/count`);
    if (!res.ok) return 0;
    const data = await res.json().catch(() => ({}));
    return Number(data?.count ?? 0);
  } catch {
    return 0;
  }
}
