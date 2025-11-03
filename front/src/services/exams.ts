import { apiJson, API_URL } from './http';
import { resolveAssetUrl } from '../shared/utils/url';

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

export async function startExam(limit = 10): Promise<ExamPayload> {
  const data = await apiJson<any>(`${API_URL}/api/exams/start?limit=${limit}`, {
    auth: true,
    fallbackError: 'No se pudo iniciar el examen',
  });

  return {
    ...data,
    diagram: { ...data.diagram, path: resolveAssetUrl(data?.diagram?.path) ?? '' },
  };
}
