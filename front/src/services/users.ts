// src/services/users.ts

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
  lastName?: string; // si tu back usa "surname", abajo enviamos ambos
  email?: string;
};

function authHeaders() {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) throw new Error('No autenticado');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function getProfile(): Promise<UserProfile> {
  const API_URL = import.meta.env.VITE_API_URL;
  console.log('↪️  getProfile(): API_URL =', API_URL);

  const token = localStorage.getItem('accessToken');
  console.log('↪️  getProfile(): token =', token);

  const res = await fetch(`${API_URL}/api/users/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('↪️  getProfile(): status =', res.status, res.statusText);
  const text = await res.text();
  console.log('↪️  getProfile(): raw body =', text);

  if (!res.ok) {
    throw new Error('No se pudo obtener el perfil');
  }

  return JSON.parse(text);
}

export async function batchCreateStudents(students: BatchStudent[]): Promise<{
  created: Array<{ id: string; name: string; lastName: string; email: string; role: string; createdAt: string }>;
  skipped: { exists: string[]; payloadDuplicates: string[] };
}> {
  const API_URL = import.meta.env.VITE_API_URL;
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) throw new Error('No autenticado');

  const res = await fetch(`${API_URL}/api/users/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ users: students }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'No se pudo completar el alta masiva');
  }
  return data;
}

export async function fetchStudents(): Promise<StudentSummary[]> {
  const API_URL = import.meta.env.VITE_API_URL;
  const res = await fetch(`${API_URL}/api/users`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar los alumnos');
  return data as StudentSummary[];
}

// Actualizar
export async function updateStudent(userId: string, dto: UpdateStudentDTO): Promise<StudentSummary> {
  const API_URL = import.meta.env.VITE_API_URL;

  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar el alumno');
  return data as StudentSummary;
}

// Eliminar
export async function deleteStudent(userId: string): Promise<void> {
  const API_URL = import.meta.env.VITE_API_URL;

  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'No se pudo eliminar el alumno');
  }
}

export async function updateMyProfile(input: { name: string; lastName: string; email: string }): Promise<UserProfile> {
  const API_URL = import.meta.env.VITE_API_URL;
  const payload = {
    name: String(input.name ?? '').trim(),
    lastName: String(input.lastName ?? '').trim(),
    email: String(input.email ?? '').trim(),
  };

  const res = await fetch(`${API_URL}/api/users/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  // lee texto primero por si el backend devolviese vacío
  const raw = await res.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}

  if (!res.ok) {
    throw new Error(data?.error || 'No se pudo actualizar el perfil');
  }

  // Aseguramos shape esperado en el front
  return {
    id: String(data.id),
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    role: data.role === 'supervisor' ? 'supervisor' : 'alumno',
  };
}

export async function changeMyPassword(params: { currentPassword: string; newPassword: string }): Promise<void> {
  const API_URL = import.meta.env.VITE_API_URL;

  const res = await fetch(`${API_URL}/api/users/me/password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      currentPassword: params.currentPassword,
      newPassword: params.newPassword,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo cambiar la contraseña');
}