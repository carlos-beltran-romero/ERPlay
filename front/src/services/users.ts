// src/services/users.ts
import { fetchAuth, API_URL } from './http';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'alumno' | 'supervisor';
}

export interface BatchStudent {
  name: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UpdateStudentDTO {
  name?: string;
  lastName?: string;
  email?: string;
  password?: string; // opcional, solo si se quiere cambiar
}

export interface StudentSummary {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: 'alumno';
  createdAt?: string;
}

type UpdateMyProfileInput = {
  name?: string;
  lastName?: string;
  email?: string;
};

// Helper: parsea JSON seguro
async function safeJson(res: Response) {
  const txt = await res.text();
  try { return txt ? JSON.parse(txt) : {}; } catch { return {}; }
}

/* ======================== Perfil (yo) ======================== */

export async function getProfile(): Promise<UserProfile> {
  const res = await fetchAuth(`${API_URL}/api/users/me`);
  if (!res.ok) throw new Error('No se pudo obtener el perfil');
  const data = await safeJson(res);

  return {
    id: String(data.id),
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    role: data.role === 'supervisor' ? 'supervisor' : 'alumno',
  };
}

export async function updateMyProfile(input: { name: string; lastName: string; email: string }): Promise<UserProfile> {
  const payload = {
    name: String(input.name ?? '').trim(),
    lastName: String(input.lastName ?? '').trim(),
    email: String(input.email ?? '').trim(),
  };

  const res = await fetchAuth(`${API_URL}/api/users/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar el perfil');

  return {
    id: String(data.id),
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    role: data.role === 'supervisor' ? 'supervisor' : 'alumno',
  };
}

export async function changeMyPassword(params: { currentPassword: string; newPassword: string }): Promise<void> {
  const res = await fetchAuth(`${API_URL}/api/users/me/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentPassword: params.currentPassword,
      newPassword: params.newPassword,
    }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || 'No se pudo cambiar la contraseña');
}

/* ======================== Gestión alumnos ======================== */

export async function batchCreateStudents(students: BatchStudent[]): Promise<{
  created: Array<{ id: string; name: string; lastName: string; email: string; role: string; createdAt: string }>;
  skipped: { exists: string[]; payloadDuplicates: string[] };
}> {
  const res = await fetchAuth(`${API_URL}/api/users/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: students }),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || 'No se pudo completar el alta masiva');
  return data;
}

export async function fetchStudents(): Promise<StudentSummary[]> {
  const res = await fetchAuth(`${API_URL}/api/users`);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar los alumnos');
  return data as StudentSummary[];
}

export async function updateStudent(userId: string, dto: UpdateStudentDTO): Promise<StudentSummary> {
  const res = await fetchAuth(`${API_URL}/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar el alumno');
  return data as StudentSummary;
}

export async function deleteStudent(userId: string): Promise<void> {
  const res = await fetchAuth(`${API_URL}/api/users/${userId}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.error || 'No se pudo eliminar el alumno');
  }
}
