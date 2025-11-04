/**
 * Módulo del controlador de autenticación
 * Gestiona todas las peticiones HTTP relacionadas con la autenticación
 * @module controllers/auth
 */

import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { createHttpError } from "../core/errors/HttpError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthService } from "../services/auth";

let authService = new AuthService();

export function setAuthService(service: AuthService) {
  authService = service;
}

/**
 * Esquemas de validación para autenticación
 */
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RefreshSchema = z.object({
  refreshToken: z.string(),
});

const ForgotSchema = z.object({
  email: z.string().email(),
});

const ResetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

/**
 * Gestiona las peticiones de inicio de sesión de usuarios
 * @param req Objeto Request de Express que contiene email y contraseña
 * @param res Objeto Response de Express
 * @returns Tokens JWT de acceso y refresco para la sesión
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = LoginSchema.parse(req.body);
  const { accessToken, refreshToken } = await authService.login(
    email,
    password
  );
  res.status(200).json({ accessToken, refreshToken });
});

/**
 * Gestiona las peticiones de cierre de sesión de usuarios
 * @param req Objeto Request de Express que contiene ID de usuario y refresh token
 * @param res Objeto Response de Express que retorna estado 204 si todo es correcto
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { refreshToken } = RefreshSchema.parse(req.body);
  await authService.logout(userId, refreshToken);
  res.sendStatus(204);
});

/**
 * Gestiona las peticiones de renovación de token de sesión
 * @param req Objeto Request de Express que contiene refresh token
 * @param res Objeto Response de Express
 * @returns Nuevos tokens JWT de acceso y refresco para la sesión
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { refreshToken: token } = RefreshSchema.parse(req.body);
    const { accessToken, refreshToken } = await authService.refreshToken(token);
    res.status(200).json({ accessToken, refreshToken });
  }
);

/**
 * Gestiona las peticiones de recuperación de contraseña
 * @param req Objeto Request de Express que contiene email del usuario
 * @param res Objeto Response de Express
 */
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = ForgotSchema.parse(req.body);
    await authService.forgotPassword(email);
    res.json({
      message:
        "Si ese correo existe, recibirás un enlace para restablecer tu contraseña.",
    });
  }
);

/**
 * Gestiona las peticiones de restablecimiento de contraseña
 * @param req Objeto Request de Express que contiene token de reset y nueva contraseña
 * @param res Objeto Response de Express
 * @param next Función next de Express para manejo de errores
 */
export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, newPassword } = ResetSchema.parse(req.body);
    try {
      await authService.resetPassword(token, newPassword);
      res
        .status(200)
        .json({ message: "Contraseña restablecida correctamente." });
    } catch (error) {
      if (error instanceof Error) {
        next(createHttpError(400, error.message));
        return;
      }
      next(error);
    }
  }
);
