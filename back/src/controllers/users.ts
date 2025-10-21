import { Request, Response, NextFunction } from 'express';
import { AppError, UsersService, type BatchStudentDTO } from '../services/user';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';
import { z } from 'zod';

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
  /**
   * Get the authenticated user's profile
   */
  getProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: 'Credenciales incorrectas' });
        return;
      }
      const { passwordHash, ...safeUser } = user as any;
      res.json(safeUser);
    } catch (err) {
      next(err as Error);
    }
  },

  /**
   * List all students (users with role STUDENT)
   */
  listUsers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repo = AppDataSource.getRepository(User);
      const students = await repo.find({
        where: { role: UserRole.STUDENT },
        select: ['id', 'name', 'lastName', 'email', 'role', 'createdAt'],
        order: { createdAt: 'DESC' },
      });
      res.json(students);
    } catch (err) {
      next(err as Error);
    }
  },

  /**
   * Bulk create students from JSON array
   * body: { users: Array<{ name, lastName, email, password }> }
   */
  batchCreateUsers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body.users as BatchStudentDTO[]; // validado en capa previa si la tienes
      const result = await usersService.batchCreateStudents(input);
      res.status(201).json(result);
    } catch (err) {
      next(err as Error);
    }
  },

  /**
   * Retrieve a user by ID (self or supervised)
   */
  getUserById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const requester = req.user!;

      if (requester.role === UserRole.STUDENT && requester.id !== userId) {
        res.status(403).json({ error: 'No autorizado' });
        return;
      }

      const user = await usersService.getById(userId);
      res.json(user);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.status).json({ error: err.message, ...(err.details ?? {}) });
        return;
      }
      next(err as Error);
    }
  },

  /**
   * Update user details (admin updating any user OR student updating himself via /users/:userId)
   */
  updateUser: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const requester = req.user!;

      if (requester.role === UserRole.STUDENT && requester.id !== userId) {
        res.status(403).json({ error: 'No autorizado' });
        return;
      }

      const updated = await usersService.updateUser(userId, {
        name: req.body.name,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
      });

      res.json(updated);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.status).json({ error: err.message, ...(err.details ?? {}) });
        return;
      }
      next(err as Error);
    }
  },

  /**
   * Delete a student user
   */
  deleteUser: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      await usersService.deleteStudent(userId);
      res.sendStatus(204);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.status).json({ error: err.message, ...(err.details ?? {}) });
        return;
      }
      next(err as Error);
    }
  },

  // ======================
  // NUEVO: /api/users/me
  // ======================

  /**
   * Update my own profile (name, lastName, email)
   */
  updateMyProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      const me = req.user!;
      if (!me?.id) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }
  
      // permite campos extra sin romper (por si llega algo más)
      const parsed = UpdateMeSchema.passthrough().parse(req.body);
      const name = String(parsed.name ?? '').trim();
      const lastName = String(parsed.lastName ?? '').trim();
      const emailLower = String(parsed.email ?? '').trim().toLowerCase();
  
      const repo = AppDataSource.getRepository(User);
  
      // ¿email en uso por otro?
      const existing = await repo.findOne({ where: { email: emailLower } });
      if (existing && existing.id !== me.id) {
        res.status(409).json({ error: 'El email ya está en uso' });
        return;
      }
  
      const user = await repo.findOne({ where: { id: me.id } });
      if (!user) {
        res.status(404).json({ error: 'Usuario no eocntrado' });
        return;
      }
  
      user.name = name;
      user.lastName = lastName;          // <- tu columna es lastName
      user.email = emailLower;
  
      const saved = await repo.save(user);
  
      // devolvemos objeto “safe” incluyendo lastName para el front
      const { passwordHash, ...safe } = saved as any;
      res.json({
        ...safe,
        lastName: saved.lastName,
      });
    } catch (err: any) {
      const msg =
        err?.code === '23505' || err?.code === 'ER_DUP_ENTRY'
          ? 'El email ya está en uso'
          : (err?.message || 'No se pudo actualizar el perfil');
      res.status(400).json({ error: msg });
    }
  },
  

  /**
   * Change my password
   */
  changeMyPassword: async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const me = req.user!;
      if (!me?.id) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const { currentPassword, newPassword } = ChangePassSchema.parse(req.body);

      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOne({ where: { id: me.id } });
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        res.status(400).json({ error: 'La contraseña actual no es correcta' });
        return;
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      await repo.save(user);

      res.json({ message: 'Contraseña actualizada' });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'No se pudo cambiar la contraseña' });
    }
  },
};

export default usersController;
