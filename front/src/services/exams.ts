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
  
  const API_URL = (import.meta as any).env.VITE_API_URL as string;
  
  function auth() {
    const t = localStorage.getItem('accessToken');
    if (!t) throw new Error('No autenticado');
    return { Authorization: `Bearer ${t}` };
  }
  
  export async function startExam(limit = 10): Promise<ExamPayload> {
    const res = await fetch(`${API_URL}/api/exams/start?limit=${limit}`, {
      headers: auth(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'No se pudo iniciar el examen');
    // normaliza ruta imagen a absoluta si hace falta
    const path = data?.diagram?.path;
    const abs = path && !String(path).startsWith('http') ? `${API_URL}${path}` : path;
    return { ...data, diagram: { ...data.diagram, path: abs } };
  }
  