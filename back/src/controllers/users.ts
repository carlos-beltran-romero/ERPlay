/**
 * @module controllers/users
 */
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';

import { createHttpError } from '../core/errors/HttpError';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';
import { UsersService, type BatchStudentDTO } from '../services/user';
import { asyncHandler } from '../utils/asyncHandler';

const usersService = new UsersService();

const UpdateMeSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().optional().default(''),
  email: z.string().email('Email inválido'),
});

const ChangePassSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const usersController = {
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw createHttpError(404, 'Credenciales incorrectas');
    }

    const { passwordHash, ...safeUser } = user as any;
    res.json(safeUser);
  }),

  listUsers: asyncHandler(async (_req: Request, res: Response) => {
    const repo = AppDataSource.getRepository(User);
    const students = await repo.find({
      where: { role: UserRole.STUDENT },
      select: ['id', 'name', 'lastName', 'email', 'role', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    res.json(students);
  }),

  batchCreateUsers: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body.users as BatchStudentDTO[];
    const result = await usersService.batchCreateStudents(input);
    res.status(201).json(result);
  }),

  getUserById: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const requester = req.user!;

    if (requester.role === UserRole.STUDENT && requester.id !== userId) {
      throw createHttpError(403, 'No autorizado');
    }

    const user = await usersService.getById(userId);
    res.json(user);
  }),

  updateUser: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const requester = req.user!;

    if (requester.role === UserRole.STUDENT && requester.id !== userId) {
      throw createHttpError(403, 'No autorizado');
    }

    const updated = await usersService.updateUser(userId, {
      name: req.body.name,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
    });

    res.json(updated);
  }),

  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    await usersService.deleteStudent(userId);
    res.sendStatus(204);
  }),

  updateMyProfile: asyncHandler(async (req: Request, res: Response) => {
    const me = req.user!;
    if (!me?.id) {
      throw createHttpError(401, 'No autenticado');
    }

    const parsed = UpdateMeSchema.passthrough().parse(req.body);
    const name = String(parsed.name ?? '').trim();
    const lastName = String(parsed.lastName ?? '').trim();
    const emailLower = String(parsed.email ?? '').trim().toLowerCase();

    const repo = AppDataSource.getRepository(User);
    const existing = await repo.findOne({ where: { email: emailLower } });
    if (existing && existing.id !== me.id) {
      throw createHttpError(409, 'El email ya está en uso');
    }

    const user = await repo.findOne({ where: { id: me.id } });
    if (!user) {
      throw createHttpError(404, 'Usuario no encontrado');
    }

    user.name = name;
    user.lastName = lastName;
    user.email = emailLower;

    const saved = await repo.save(user);

    const { passwordHash, ...safe } = saved as any;
    res.json({
      ...safe,
      lastName: saved.lastName,
    });
  }),

  changeMyPassword: asyncHandler(async (req: Request, res: Response) => {
    const me = req.user!;
    if (!me?.id) {
      throw createHttpError(401, 'No autenticado');
    }

    const { currentPassword, newPassword } = ChangePassSchema.parse(req.body);
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: me.id } });
    if (!user) {
      throw createHttpError(404, 'Usuario no encontrado');
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw createHttpError(400, 'La contraseña actual no es correcta');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await repo.save(user);

    res.json({ message: 'Contraseña actualizada' });
  }),
};

export default usersController;
