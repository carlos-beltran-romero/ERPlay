/**
 * @module controllers/auth
 */
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { createHttpError } from '../core/errors/HttpError';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthService } from '../services/auth';

const authService = new AuthService();

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

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = LoginSchema.parse(req.body);
  const { accessToken, refreshToken } = await authService.login(email, password);
  res.status(200).json({ accessToken, refreshToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { refreshToken } = RefreshSchema.parse(req.body);
  await authService.logout(userId, refreshToken);
  res.sendStatus(204);
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = RefreshSchema.parse(req.body);
  const { accessToken, refreshToken } = await authService.refreshToken(token);
  res.status(200).json({ accessToken, refreshToken });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = ForgotSchema.parse(req.body);
  await authService.forgotPassword(email);
  res.json({ message: 'Si ese correo existe, recibirás un enlace para restablecer tu contraseña.' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = ResetSchema.parse(req.body);
  try {
    await authService.resetPassword(token, newPassword);
    res.status(200).json({ message: 'Contraseña restablecida correctamente.' });
  } catch (error) {
    if (error instanceof Error) {
      next(createHttpError(400, error.message));
      return;
    }
    next(error);
  }
});
