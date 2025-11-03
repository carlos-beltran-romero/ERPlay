import bcrypt from 'bcrypt';

import { createHttpError } from '../core/errors/HttpError';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';

export interface UpdateUserDTO {
  name?: string;
  lastName?: string;       // si tu columna es "lastName", ver nota más abajo
  email?: string;
  password?: string;       // si llega, se cambia
}

export interface BatchStudentDTO {
  name: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SafeUser {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export class UsersService {
  private userRepo = AppDataSource.getRepository(User);

  // Crea los válidos, omite existentes o duplicados en payload
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

    // Duplicados dentro del propio lote (identifica correos repetidos)
    const counter = new Map<string, number>();
    const duplicatesInPayload: string[] = [];
    for (const u of input) {
      const c = (counter.get(u.email) ?? 0) + 1;
      counter.set(u.email, c);
      if (c === 2) duplicatesInPayload.push(u.email);
    }
    const payloadDupSet = new Set(duplicatesInPayload);

    // Ya existentes en BD
    const existing = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.email'])
      .where('LOWER(u.email) IN (:...emails)', { emails: input.map(u => u.email) })
      .getMany();
    const existingSet = new Set(existing.map(e => e.email));

    // Filtramos a crear: 1ª aparición en payload y que NO exista en BD
    const seenCreate = new Set<string>();
    const toCreate = input.filter(u => {
      if (existingSet.has(u.email)) return false;
      if (payloadDupSet.has(u.email)) {
        // si está duplicado, solo dejamos pasar la 1ª ocurrencia
        if (seenCreate.has(u.email)) return false;
      }
      if (seenCreate.has(u.email)) return false;
      seenCreate.add(u.email);
      return true;
    });

    // Crear entidades + hash
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
  async listStudents(): Promise<SafeUser[]> {
    const rows = await this.userRepo.find({
      where: { role: UserRole.STUDENT },
      select: ['id', 'name', 'lastName', 'email', 'role', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    return rows as SafeUser[];
  }

  async getById(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name', 'lastName', 'email', 'role', 'createdAt'],
    });
    if (!user) throw createHttpError(404, 'Usuario no encontrado');
    return user as SafeUser;
  }

  async updateUser(userId: string, dto: UpdateUserDTO): Promise<SafeUser> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw createHttpError(404, 'Usuario no encontrado');

    // Email en uso por otro usuario
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

    if (dto.lastName !== undefined) {
      // 👇 Si en tu entidad el campo es lastName mapeado a "lastName", esto funciona.
      // Si aún tienes "lastName" en la clase, descomenta la línea alternativa:
      user.lastName = dto.lastName.trim();
      // (user as any).lastName = dto.lastName.trim();
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const saved = await this.userRepo.save(user);
    const { passwordHash, ...safe } = saved as any;
    return safe as SafeUser;
  }

  async deleteStudent(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw createHttpError(404, 'Usuario no encontrado');
    if (user.role !== UserRole.STUDENT) {
      throw createHttpError(403, 'Solo se pueden eliminar alumnos');
    }
    await this.userRepo.remove(user);
  }
}


