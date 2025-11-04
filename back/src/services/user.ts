/**
 * Módulo de servicio de usuarios
 * Gestiona CRUD de estudiantes y perfiles de usuario
 * @module services/user
 */

import bcrypt from 'bcrypt';
import { createHttpError } from '../core/errors/HttpError';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';

/** DTO para actualización de perfil de usuario */
export interface UpdateUserDTO {
  name?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

/** DTO para creación masiva de estudiantes */
export interface BatchStudentDTO {
  name: string;
  lastName: string;
  email: string;
  password: string;
}

/** Representación segura de usuario sin datos sensibles */
export interface SafeUser {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

/**
 * Servicio de usuarios
 * Gestiona operaciones sobre estudiantes y perfiles
 */
export class UsersService {
  private userRepo = AppDataSource.getRepository(User);

  /**
   * Crea múltiples estudiantes en lote
   * Omite usuarios con emails duplicados o ya existentes
   * 
   * @param payload - Array de estudiantes a crear
   * @returns Usuarios creados y listas de omitidos
   * @remarks
   * - Normaliza emails a lowercase antes de comparar
   * - Duplicados en payload: solo crea la primera ocurrencia
   * - Existentes en BD: se omiten sin error
   * - Hash de contraseñas con bcrypt (cost factor 10)
   */
  async batchCreateStudents(payload: BatchStudentDTO[]): Promise<{
    created: SafeUser[];
    skipped: { exists: string[]; payloadDuplicates: string[] };
  }> {
    const input = payload.map(u => ({
      name: u.name.trim(),
      lastName: u.lastName.trim(),
      email: u.email.trim().toLowerCase(),
      password: u.password,
    }));

    const counter = new Map<string, number>();
    const duplicatesInPayload: string[] = [];
    for (const u of input) {
      const c = (counter.get(u.email) ?? 0) + 1;
      counter.set(u.email, c);
      if (c === 2) duplicatesInPayload.push(u.email);
    }
    const payloadDupSet = new Set(duplicatesInPayload);

    const existing = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.email'])
      .where('LOWER(u.email) IN (:...emails)', { emails: input.map(u => u.email) })
      .getMany();
    const existingSet = new Set(existing.map(e => e.email));

    const seenCreate = new Set<string>();
    const toCreate = input.filter(u => {
      if (existingSet.has(u.email)) return false;
      if (payloadDupSet.has(u.email)) {
        if (seenCreate.has(u.email)) return false;
      }
      if (seenCreate.has(u.email)) return false;
      seenCreate.add(u.email);
      return true;
    });

    const entities = await Promise.all(
      toCreate.map(async u => {
        const passwordHash = await bcrypt.hash(u.password, 10);
        return this.userRepo.create({
          name: u.name,
          lastName: u.lastName,
          email: u.email,
          passwordHash,
          role: UserRole.STUDENT,
        });
      })
    );

    const saved = await this.userRepo.save(entities);

    const created: SafeUser[] = saved.map(u => ({
      id: u.id,
      name: u.name,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));

    return {
      created,
      skipped: {
        exists: Array.from(existingSet),
        payloadDuplicates: Array.from(payloadDupSet),
      },
    };
  }

  /**
   * Lista todos los estudiantes del sistema
   * @returns Array de estudiantes ordenados por fecha de creación descendente
   */
  async listStudents(): Promise<SafeUser[]> {
    const rows = await this.userRepo.find({
      where: { role: UserRole.STUDENT },
      select: ['id', 'name', 'lastName', 'email', 'role', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    return rows as SafeUser[];
  }

  /**
   * Obtiene un usuario por ID
   * @param userId - ID del usuario
   * @returns Datos del usuario sin contraseña
   * @throws {HttpError} 404 si el usuario no existe
   */
  async getById(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name', 'lastName', 'email', 'role', 'createdAt'],
    });
    if (!user) throw createHttpError(404, 'Usuario no encontrado');
    return user as SafeUser;
  }

  /**
   * Actualiza datos de perfil de usuario
   * Permite cambiar nombre, apellidos, email y contraseña
   * 
   * @param userId - ID del usuario a actualizar
   * @param dto - Campos a actualizar (todos opcionales)
   * @returns Usuario actualizado
   * @throws {HttpError} 404 si el usuario no existe
   * @throws {HttpError} 409 si el nuevo email ya está en uso
   * @remarks
   * - Email: valida unicidad antes de actualizar
   * - Password: rehashea con bcrypt si se proporciona
   * - Campos no enviados permanecen sin cambios
   */
  async updateUser(userId: string, dto: UpdateUserDTO): Promise<SafeUser> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw createHttpError(404, 'Usuario no encontrado');

    if (dto.email) {
      const exists = await this.userRepo.findOne({
        where: { email: dto.email.toLowerCase() },
      });
      if (exists && exists.id !== user.id) {
        throw createHttpError(409, 'El email ya está registrado');
      }
      user.email = dto.email.toLowerCase().trim();
    }

    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const saved = await this.userRepo.save(user);
    const { passwordHash, ...safe } = saved as any;
    return safe as SafeUser;
  }

  /**
   * Elimina un estudiante del sistema
   * 
   * @param userId - ID del estudiante a eliminar
   * @throws {HttpError} 404 si el usuario no existe
   * @throws {HttpError} 403 si el usuario no es estudiante
   * @remarks
   * - Solo permite eliminar usuarios con role = STUDENT
   * - La eliminación es en cascada (sesiones, resultados, etc.)
   */
  async deleteStudent(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw createHttpError(404, 'Usuario no encontrado');
    if (user.role !== UserRole.STUDENT) {
      throw createHttpError(403, 'Solo se pueden eliminar alumnos');
    }
    await this.userRepo.remove(user);
  }
}