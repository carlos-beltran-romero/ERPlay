import { API_URL, fetchAuth } from './http';

export type QuestionSource = 'catalog' | 'student';

export interface QuestionInput {
  id?: string;
  prompt: string;
  hint: string;
  options: string[];
  correctIndex: number;
}

export interface DiagramSummary {
  id: string;
  title: string;
  path: string;
  createdAt: string;
  questionsCount?: number;
}

export interface DiagramDetail {
  id: string;
  title: string;
  path: string;
  questions: Array<QuestionInput & { source: QuestionSource }>;
}

const toAbsolutePath = (publicPath?: string): string =>
  publicPath && !publicPath.startsWith('http') ? `${API_URL}${publicPath}` : publicPath ?? '';

/**
 * Sube un nuevo diagrama con sus preguntas asociadas.
 * @public
 * @param payload Datos del formulario con archivo y preguntas.
 * @returns Identificador y ruta pública del recurso creado.
 */
export async function uploadDiagram(payload: {
  title: string;
  imageFile: File;
  questions: QuestionInput[];
}): Promise<{ id: string; path: string }> {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('image', payload.imageFile);
  formData.append('questions', JSON.stringify(payload.questions));

  const response = await fetchAuth(`${API_URL}/api/diagrams`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo subir el diagrama');
  }
  return data;
}

/**
 * Recupera el listado de diagramas disponibles para supervisión.
 * @public
 * @returns Colección de resúmenes de diagramas.
 */
export async function listDiagrams(): Promise<DiagramSummary[]> {
  const response = await fetchAuth(`${API_URL}/api/diagrams`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo cargar la lista de tests');
  }
  return data;
}

/**
 * Obtiene el detalle de un diagrama concreto.
 * @public
 * @param id Identificador del diagrama.
 * @returns Datos normalizados del diagrama, incluida la ruta absoluta.
 */
export async function getDiagram(id: string): Promise<DiagramDetail> {
  const response = await fetchAuth(`${API_URL}/api/diagrams/${id}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo cargar el test');
  }
  return {
    ...data,
    path: toAbsolutePath(data.path),
  };
}

/**
 * Actualiza un diagrama existente.
 * @public
 * @param id Identificador del diagrama.
 * @param formData FormData con campos a actualizar.
 * @returns Mensaje de confirmación.
 */
export async function updateDiagram(
  id: string,
  formData: FormData,
): Promise<{ message: string }> {
  const response = await fetchAuth(`${API_URL}/api/diagrams/${id}`, {
    method: 'PUT',
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo actualizar');
  }
  return data;
}

/**
 * Elimina un diagrama existente.
 * @public
 * @param id Identificador del diagrama.
 */
export async function deleteDiagram(id: string): Promise<void> {
  const response = await fetchAuth(`${API_URL}/api/diagrams/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || 'No se pudo eliminar el test');
  }
}

/**
 * Devuelve la lista pública de diagramas disponibles.
 * @public
 * @returns Resumen para selectores del alumnado.
 */
export async function listPublicDiagrams(): Promise<DiagramSummary[]> {
  const response = await fetchAuth(`${API_URL}/api/diagrams/public`);
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    const error: Error & { code?: number } = new Error('Acceso denegado');
    error.code = response.status;
    throw error;
  }
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudieron cargar los diagramas');
  }
  return data;
}
