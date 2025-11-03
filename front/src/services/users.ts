import { apiJson } from './http';

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

/* ======================== Perfil (yo) ======================== */

export async function getProfile(): Promise<UserProfile> {
  const data = await apiJson<any>('/api/users/me', {
    auth: true,
    fallbackError: 'No se pudo obtener el perfil',
  });

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

  const data = await apiJson<any>('/api/users/me', {
    method: 'PUT',
    auth: true,
    json: payload,
    fallbackError: 'No se pudo actualizar el perfil',
  });

  return {
    id: String(data.id),
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    role: data.role === 'supervisor' ? 'supervisor' : 'alumno',
  };
}

export async function changeMyPassword(params: { currentPassword: string; newPassword: string }): Promise<void> {
  await apiJson<void>('/api/users/me/password', {
    method: 'POST',
    auth: true,
    json: {
      currentPassword: params.currentPassword,
      newPassword: params.newPassword,
    },
    fallbackError: 'No se pudo cambiar la contraseña',
  });
}

/* ======================== Gestión alumnos ======================== */

export async function batchCreateStudents(students: BatchStudent[]): Promise<{
  created: Array<{ id: string; name: string; lastName: string; email: string; role: string; createdAt: string }>;
  skipped: { exists: string[]; payloadDuplicates: string[] };
}> {
  return apiJson('/api/users/batch', {
    method: 'POST',
    auth: true,
    json: { users: students },
    fallbackError: 'No se pudo completar el alta masiva',
  });
}

export async function fetchStudents(): Promise<StudentSummary[]> {
  return apiJson<StudentSummary[]>('/api/users', {
    auth: true,
    fallbackError: 'No se pudieron cargar los alumnos',
  });
}

export async function updateStudent(userId: string, dto: UpdateStudentDTO): Promise<StudentSummary> {
  return apiJson<StudentSummary>(`/api/users/${userId}`, {
    method: 'PUT',
    auth: true,
    json: dto,
    fallbackError: 'No se pudo actualizar el alumno',
  });
}

export async function deleteStudent(userId: string): Promise<void> {
  await apiJson<void>(`/api/users/${userId}`, {
    method: 'DELETE',
    auth: true,
    fallbackError: 'No se pudo eliminar el alumno',
  });
}
