// src/services/review.ts
const API_URL = import.meta.env.VITE_API_URL;

export async function getPendingStudentQuestionsCount(): Promise<number> {
  const token = localStorage.getItem('accessToken');
  if (!token) return 0;

  try {
    const res = await fetch(`${API_URL}/api/questions/pending/count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data?.count ?? 0);
  } catch {
    return 0;
  }
}
