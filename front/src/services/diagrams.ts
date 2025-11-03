import { apiJson } from './http';
import { resolveAssetUrl } from '../shared/utils/url';

export interface QuestionInput {
  prompt: string;
  options: string[];      // >=2
  correctIndex: number;   // 0..n-1
  hint: string;
}

export interface DiagramSummary {
  id: string;
  title: string;
  path: string;           // url pública de la imagen
  createdAt: string;
  questionsCount?: number;
}

export interface DiagramDetail {
  id: string;
  title: string;
  path: string;
  questions: QuestionInput[];
}

// Crear diagrama (FormData → NO forzar Content-Type)
export async function uploadDiagram(payload: {
  title: string;
  imageFile: File;
  questions: QuestionInput[];
}): Promise<{ id: string }> {
  const fd = new FormData();
  fd.append('title', payload.title);
  fd.append('image', payload.imageFile);
  fd.append('questions', JSON.stringify(payload.questions));

  return apiJson('/api/diagrams', {
    method: 'POST',
    auth: true,
    body: fd,
    fallbackError: 'No se pudo subir el diagrama',
  });
}

export async function listDiagrams(): Promise<DiagramSummary[]> {
  const data = await apiJson<DiagramSummary[]>('/api/diagrams', {
    auth: true,
    fallbackError: 'No se pudo cargar la lista de tests',
  });
  return data.map((item) => ({ ...item, path: resolveAssetUrl(item.path) ?? '' }));
}

export async function getDiagram(id: string) {
  const data = await apiJson<any>(`/api/diagrams/${id}`, {
    auth: true,
    fallbackError: 'No se pudo cargar el test',
  });
  return { ...data, path: resolveAssetUrl(data.path) ?? '' };
}

export async function updateDiagram(id: string, formData: FormData) {
  return apiJson(`/api/diagrams/${id}`, {
    method: 'PUT',
    auth: true,
    body: formData,
    fallbackError: 'No se pudo actualizar',
  });
}

export async function deleteDiagram(id: string): Promise<void> {
  await apiJson<void>(`/api/diagrams/${id}`, {
    method: 'DELETE',
    auth: true,
    fallbackError: 'No se pudo eliminar el test',
  });
}

// Selector público (alumno/supervisor)
export async function listPublicDiagrams() {
  const data = await apiJson<any>(`/api/diagrams/public`, {
    auth: true,
    fallbackError: 'No se pudieron cargar los diagramas',
  });
  return Array.isArray(data)
    ? data.map((item) => ({ ...item, path: resolveAssetUrl(item.path) }))
    : data;
}
