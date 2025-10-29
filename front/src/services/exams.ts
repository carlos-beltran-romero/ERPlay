// src/services/exams.ts
import { fetchAuth, API_URL } from './http';

export type ExamQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  hint?: string;
};

export type ExamPayload = {
  diagram: { id: string; title: string; path: string };
  questions: ExamQuestion[];
};

const toAbs = (p?: string) =>
  p && !String(p).startsWith('http') ? `${API_URL}${p}` : (p || '');

export async function startExam(limit = 10): Promise<ExamPayload> {
  const res = await fetchAuth(`${API_URL}/api/exams/start?limit=${limit}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo iniciar el examen');

  return {
    ...data,
    diagram: { ...data.diagram, path: toAbs(data?.diagram?.path) },
  };
}
