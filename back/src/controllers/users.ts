/**
 * Módulo del controlador de usuarios
 * Gestiona las peticiones relacionadas con la administración y gestión de usuarios
 * @module controllers/users
 */

import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";

import { createHttpError } from "../core/errors/HttpError";
import { AppDataSource } from "../data-source";
import { User, UserRole } from "../models/User";
import { UsersService, type BatchStudentDTO } from "../services/user";
import { asyncHandler } from "../utils/asyncHandler";

const usersService = new UsersService();

/**
 * Esquemas de validación para usuarios
 */
const UpdateMeSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().optional().default(""),
  email: z.string().email("Email inválido"),
});

const ChangePassSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

/**
 * Controlador de usuarios con todas las operaciones CRUD y de gestión
 */
const usersController = {
  /**
   * Obtiene el perfil del usuario autenticado actual
   * @param req Objeto Request de Express con usuario autenticado
   * @param res Objeto Response de Express
   * @returns Datos del perfil del usuario sin información sensible
   */
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw createHttpError(404, "Credenciales incorrectas");
    }

    const { passwordHash, ...safeUser } = user as any;
    res.json(safeUser);
  }),

  /**
   * Lista todos los usuarios estudiantes del sistema
   * @param req Objeto Request de Express
   * @param res Objeto Response de Express
   * @returns Lista de estudiantes ordenados por fecha de creación
   * @requires Role.SUPERVISOR
   */
  listUsers: asyncHandler(async (_req: Request, res: Response) => {
    const repo = AppDataSource.getRepository(User);
    const students = await repo.find({
      where: { role: UserRole.STUDENT },
      select: ["id", "name", "lastName", "email", "role", "createdAt"],
      order: { createdAt: "DESC" },
    });
    res.json(students);
  }),

  /**
   * Crea múltiples usuarios estudiantes en lote desde un array
   * Útil para importación masiva de estudiantes al inicio de curso
   * @param req Objeto Request de Express con array de usuarios en body.users
   * @param res Objeto Response de Express
   * @returns Resultado de la operación con usuarios creados y errores si los hay
   * @requires Role.SUPERVISOR
   */
  batchCreateUsers: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body.users as BatchStudentDTO[];
    const result = await usersService.batchCreateStudents(input);
    res.status(201).json(result);
  }),

  /**
   * Obtiene información detallada de un usuario específico por su ID
   * Los estudiantes solo pueden ver su propio perfil, supervisores pueden ver cualquiera
   * @param req Objeto Request de Express con userId en params
   * @param res Objeto Response de Express
   * @returns Datos completos del usuario solicitado
   */
  getUserById: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const requester = req.user!;

    if (requester.role === UserRole.STUDENT && requester.id !== userId) {
      throw createHttpError(403, "No autorizado");
    }

    const user = await usersService.getById(userId);
    res.json(user);
  }),

  /**
   * Actualiza la información de un usuario específico
   * Los estudiantes solo pueden actualizar su propio perfil
   * @param req Objeto Request de Express con userId en params y datos actualizados en body
   * @param res Objeto Response de Express
   * @returns Usuario actualizado
   */
  updateUser: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const requester = req.user!;
    const requestedPassword =
      typeof req.body.password === "string" && req.body.password.length > 0
        ? String(req.body.password)
        : undefined;

    if (requester.role === UserRole.STUDENT && requester.id !== userId) {
      throw createHttpError(403, "No autorizado");
    }

    const updated = await usersService.updateUser(userId, {
      name: req.body.name,
      lastName: req.body.lastName,
      email: req.body.email,
      password: requestedPassword,
    });

    if (
      requestedPassword &&
      requester.role === UserRole.SUPERVISOR &&
      requester.id !== userId
    ) {
      await usersService.sendPasswordUpdatedEmail(updated, requestedPassword);
    }

    res.json(updated);
  }),

  /**
   * Elimina un usuario estudiante del sistema de forma permanente
   * @param req Objeto Request de Express con userId en params
   * @param res Objeto Response de Express con estado 204
   * @requires Role.SUPERVISOR
   */
  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    await usersService.deleteStudent(userId);
    res.sendStatus(204);
  }),

  /**
   * Actualiza el perfil del usuario autenticado actual
   * Permite modificar nombre, apellido y email
   * Verifica que el nuevo email no esté ya en uso por otro usuario
   * @param req Objeto Request de Express con datos actualizados en body
   * @param res Objeto Response de Express
   * @returns Perfil actualizado del usuario sin información sensible
   */
  updateMyProfile: asyncHandler(async (req: Request, res: Response) => {
    const me = req.user!;
    if (!me?.id) {
      throw createHttpError(401, "No autenticado");
    }

    const parsed = UpdateMeSchema.passthrough().parse(req.body);
    const name = String(parsed.name ?? "").trim();
    const lastName = String(parsed.lastName ?? "").trim();
    const emailLower = String(parsed.email ?? "")
      .trim()
      .toLowerCase();

    const repo = AppDataSource.getRepository(User);
    const existing = await repo.findOne({ where: { email: emailLower } });
    if (existing && existing.id !== me.id) {
      throw createHttpError(409, "El email ya está en uso");
    }

    const user = await repo.findOne({ where: { id: me.id } });
    if (!user) {
      throw createHttpError(404, "Usuario no encontrado");
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

  /**
   * Cambia la contraseña del usuario autenticado actual
   * Requiere verificación de la contraseña actual por seguridad
   * La nueva contraseña se hashea antes de almacenarse
   * @param req Objeto Request de Express con currentPassword y newPassword en body
   * @param res Objeto Response de Express
   * @returns Mensaje de confirmación de cambio exitoso
   */
  changeMyPassword: asyncHandler(async (req: Request, res: Response) => {
    const me = req.user!;
    if (!me?.id) {
      throw createHttpError(401, "No autenticado");
    }

    const { currentPassword, newPassword } = ChangePassSchema.parse(req.body);
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: me.id } });
    if (!user) {
      throw createHttpError(404, "Usuario no encontrado");
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw createHttpError(400, "La contraseña actual no es correcta");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await repo.save(user);

    res.json({ message: "Contraseña actualizada" });
  }),
};

export default usersController;
