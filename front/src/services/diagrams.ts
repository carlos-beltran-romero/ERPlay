// src/services/diagrams.ts
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

const API_URL = import.meta.env.VITE_API_URL;

function authHeaderOnly() {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('No autenticado');
  return { Authorization: `Bearer ${token}` };
}

// Ya lo tenías:
export async function uploadDiagram(payload: {
  title: string;
  imageFile: File;
  questions: QuestionInput[];
}): Promise<{ id: string }> {
  const fd = new FormData();
  fd.append('title', payload.title);
  fd.append('image', payload.imageFile);
  fd.append('questions', JSON.stringify(payload.questions));

  const res = await fetch(`${API_URL}/api/diagrams`, {
    method: 'POST',
    headers: authHeaderOnly(),
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo subir el diagrama');
  return data;
}

// NUEVOS:


const toAbs = (p?: string) => (p && !p.startsWith('http') ? `${API_URL}${p}` : p ?? '');

export async function listDiagrams(): Promise<DiagramSummary[]> {
  const res = await fetch(`${API_URL}/api/diagrams`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`! }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'No se pudo cargar la lista de tests');
  return data;
}

export async function getDiagram(id: string) {
  const res = await fetch(`${API_URL}/api/diagrams/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`! }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'No se pudo cargar el test');
  return { ...data, path: toAbs(data.path) };
}

export async function updateDiagram(id: string, formData: FormData) {
  const res = await fetch(`${API_URL}/api/diagrams/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`! },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar');
  return data;
}

export async function deleteDiagram(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/diagrams/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaderOnly() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'No se pudo eliminar el test');
  }
}

// src/services/diagrams.ts
export async function listPublicDiagrams() {
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('accessToken');
  if (!token) throw Object.assign(new Error('No autenticado'), { code: 401 });

  const res = await fetch(`${API_URL}/api/diagrams/public`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 || res.status === 403) {
    const err: any = new Error('Acceso denegado');
    err.code = res.status;
    throw err;
  }
  if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar los diagramas');
  return data;
}



