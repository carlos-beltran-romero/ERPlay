import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AuthService } from '../services/auth';

// Instancia del servicio de autenticación
const authService = new AuthService();

// Schemas Zod para validación
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



export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const { accessToken, refreshToken } = await authService.login(email, password);
    res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { refreshToken } = RefreshSchema.parse(req.body);
    await authService.logout(userId, refreshToken);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = RefreshSchema.parse(req.body);
    const { accessToken, refreshToken } = await authService.refreshToken(token);
    res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = ForgotSchema.parse(req.body);
    await authService.forgotPassword(email);
    res.json({ message: 'Si ese correo existe, recibirás un enlace para restablecer tu contraseña.' });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parseamos token y newPassword
    const { token, newPassword } = ResetSchema.parse(req.body);
    await authService.resetPassword(token, newPassword);
    // Respuesta exitosa
    res.status(200).json({ message: 'Contraseña restablecida correctamente.' });
  } catch (err: any) {
    // Manejo de errores propios y de validación
    let message = 'Error al restablecer contraseña';
    if (err instanceof ZodError) {
      message = err.issues.map(e => e.message).join('; ');
    } else if (err instanceof Error) {
      message = err.message;
    }
    res.status(400).json({ error: message });
  }
};
