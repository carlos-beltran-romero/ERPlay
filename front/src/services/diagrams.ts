// src/services/diagrams.ts
import { fetchAuth, API_URL } from './http';

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

const toAbs = (p?: string) =>
  (p && !p.startsWith('http') ? `${API_URL}${p}` : p ?? '');

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

  const res = await fetchAuth(`${API_URL}/api/diagrams`, {
    method: 'POST',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo subir el diagrama');
  return data;
}

export async function listDiagrams(): Promise<DiagramSummary[]> {
  const res = await fetchAuth(`${API_URL}/api/diagrams`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'No se pudo cargar la lista de tests');
  return data;
}

export async function getDiagram(id: string) {
  const res = await fetchAuth(`${API_URL}/api/diagrams/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'No se pudo cargar el test');
  return { ...data, path: toAbs(data.path) };
}

export async function updateDiagram(id: string, formData: FormData) {
  const res = await fetchAuth(`${API_URL}/api/diagrams/${id}`, {
    method: 'PUT',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar');
  return data;
}

export async function deleteDiagram(id: string): Promise<void> {
  const res = await fetchAuth(`${API_URL}/api/diagrams/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'No se pudo eliminar el test');
  }
}

// Selector público (alumno/supervisor)
export async function listPublicDiagrams() {
  const res = await fetchAuth(`${API_URL}/api/diagrams/public`);
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 || res.status === 403) {
    const err: any = new Error('Acceso denegado');
    err.code = res.status;
    throw err;
  }
  if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar los diagramas');
  return data;
}
