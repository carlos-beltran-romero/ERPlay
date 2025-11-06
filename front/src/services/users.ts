/**
 * Módulo de servicios de usuarios
 * Gestiona perfil propio y administración de estudiantes
 * @module services/users
 */

import { apiJson } from './http';

/** Perfil de usuario autenticado */
export interface UserProfile {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: 'alumno' | 'supervisor';
}

/** Estudiante para alta masiva desde CSV */
export interface BatchStudent {
  name: string;
  lastName: string;
  email: string;
  password: string;
}

/** Datos actualizables de estudiante */
export interface UpdateStudentDTO {
  name?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

/** Resumen de estudiante en listados */
export interface StudentSummary {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: 'alumno';
  createdAt?: string;
}

/**
 * Obtiene perfil del usuario autenticado
 * @returns Datos básicos (id, nombre, email, rol)
 */
export async function getProfile(): Promise<UserProfile> {
  const data = await apiJson<any>('/api/users/me', {
    auth: true,
    fallbackError: 'No se pudo obtener el perfil',
  });

  return {
    id: String(data.id),
    name: String(data.name ?? ''),
    lastName: String(data.lastName ?? data.surname ?? data.last_name ?? ''),
    email: String(data.email ?? ''),
    role: data.role === 'supervisor' ? 'supervisor' : 'alumno',
  };
}

/**
 * Actualiza perfil del usuario autenticado
 * @param input - Nombre, apellido y email nuevos
 * @returns Perfil actualizado
 * @remarks Requiere contraseña actual si se cambia email (según backend)
 */
export async function updateMyProfile(input: {
  name: string;
  lastName: string;
  email: string;
}): Promise<UserProfile> {
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
    lastName: String(data.lastName ?? data.surname ?? data.last_name ?? ''),
    email: String(data.email ?? ''),
    role: data.role === 'supervisor' ? 'supervisor' : 'alumno',
  };
}

/**
 * Cambia contraseña del usuario autenticado
 * @param params - Contraseña actual y nueva
 * @throws {Error} Si la contraseña actual es incorrecta
 * @remarks Requiere mínimo 6 caracteres en newPassword (según backend)
 */
export async function changeMyPassword(params: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
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

/**
 * Crea estudiantes en lote desde CSV
 * @param students - Array de estudiantes con credenciales
 * @returns Creados y omitidos (duplicados en payload o BD)
 * @remarks Omite emails duplicados sin error, continúa con el resto
 */
export async function batchCreateStudents(students: BatchStudent[]): Promise<{
  created: Array<{
    id: string;
    name: string;
    lastName: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
  skipped: { exists: string[]; payloadDuplicates: string[] };
}> {
  return apiJson('/api/users/batch', {
    method: 'POST',
    auth: true,
    json: { users: students },
    fallbackError: 'No se pudo completar el alta masiva',
  });
}

/**
 * Lista todos los estudiantes del sistema
 * Solo accesible para supervisores
 * @returns Array de estudiantes ordenados alfabéticamente
 */
export async function fetchStudents(): Promise<StudentSummary[]> {
  return apiJson<StudentSummary[]>('/api/users', {
    auth: true,
    fallbackError: 'No se pudieron cargar los alumnos',
  });
}

/**
 * Actualiza datos de un estudiante
 * @param userId - ID del estudiante a actualizar
 * @param dto - Campos a modificar (patch parcial)
 * @returns Estudiante actualizado
 * @remarks Solo supervisores pueden modificar otros usuarios
 */
export async function updateStudent(
  userId: string,
  dto: UpdateStudentDTO
): Promise<StudentSummary> {
  return apiJson<StudentSummary>(`/api/users/${userId}`, {
    method: 'PUT',
    auth: true,
    json: dto,
    fallbackError: 'No se pudo actualizar el alumno',
  });
}

/**
 * Elimina un estudiante
 * @param userId - ID del estudiante a eliminar
 * @throws {Error} 403 si el estudiante tiene sesiones activas
 * @remarks Eliminación en cascada (sesiones, resultados, preguntas, reclamaciones)
 */
export async function deleteStudent(userId: string): Promise<void> {
  await apiJson<void>(`/api/users/${userId}`, {
    method: 'DELETE',
    auth: true,
    fallbackError: 'No se pudo eliminar el alumno',
  });
}