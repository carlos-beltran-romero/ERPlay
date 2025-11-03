/**
 * @module services/auth
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { defaultMailer } from '../config/mailer';
import { env } from '../config/env';
import { createHttpError, HttpError } from '../core/errors/HttpError';
import { AppDataSource } from '../data-source';
import { RefreshToken } from '../models/RefreshToken';
import { User } from '../models/User';

const PASSWORD_SALT_ROUNDS = 10;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const RESET_TOKEN_TTL = '1h';

export class AuthService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

  async login(email: string, password: string) {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) throw createHttpError(401, 'Credenciales incorrectas');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw createHttpError(401, 'Credenciales incorrectas');

    const accessToken = jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshToken = jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_TTL,
    });

    const tokenEntity = this.refreshTokenRepository.create({ token: refreshToken, user });
    await this.refreshTokenRepository.save(tokenEntity);

    return { accessToken, refreshToken };
  }

  async logout(userId: string, refreshToken: string) {
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, user: { id: userId } },
    });

    if (token) {
      await this.refreshTokenRepository.remove(token);
    }
  }

  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };

      const existing = await this.refreshTokenRepository.findOne({
        where: { token },
        relations: ['user'],
      });

      if (!existing) throw createHttpError(401, 'Token no válido');

      const accessToken = jwt.sign(
        { id: existing.user.id, role: existing.user.role },
        env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL },
      );

      const newRefreshToken = jwt.sign({ id: decoded.id }, env.JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_TTL,
      });

      existing.token = newRefreshToken;
      await this.refreshTokenRepository.save(existing);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw createHttpError(401, 'Token inválido o expirado', error instanceof Error ? error.message : error);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) return;

    const token = jwt.sign({ id: user.id }, env.JWT_RESET_SECRET, { expiresIn: RESET_TOKEN_TTL });
    const frontBase = (env.FRONTEND_URL ?? '').replace(/\/+$/, '');
    const resetLink = frontBase
      ? `${frontBase}/reset-password?token=${token}`
      : `/reset-password?token=${token}`;

    const displayName = user.name?.trim() ? user.name.trim() : user.email;

    await defaultMailer.sendMail({
      from: '"ERPlay Soporte" <no-reply@erplay.com>',
      to: user.email,
      subject: 'Restablece tu contraseña en ERPlay',
      html: `
        <div style="font-family:Arial,sans-serif; color:#333; max-width:600px; margin:0 auto; padding:20px;">
          <h2 style="color:#2c3e50;">¡Hola ${displayName}!</h2>
          <p>Has solicitado restablecer la contraseña de tu cuenta en <strong>ERPlay</strong>.</p>
          <div style="text-align:center; margin:40px 0;">
            <a href="${resetLink}" style="background-color:#1d4ed8; color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;" target="_blank">
              Restablecer contraseña
            </a>
          </div>
          <p>Este enlace expirará en <strong>1 hora</strong>. Si no lo solicitaste, ignora este correo.</p>
          <hr style="border:none; border-top:1px solid #eee; margin:30px 0;" />
          <p style="font-size:12px; color:#999; text-align:center;">
            ERPlay Inc.<br/>
            Calle Larga 13, Jerez de la Frontera, Cádiz<br/>
            &copy; ${new Date().getFullYear()} ERPlay. Todos los derechos reservados.
          </p>
        </div>
      `,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const payload = jwt.verify(token, env.JWT_RESET_SECRET) as { id: string };
      const user = await this.userRepository.findOneBy({ id: payload.id });
      if (!user) throw createHttpError(404, 'Usuario no encontrado');

      user.passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
      await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw createHttpError(401, 'Token inválido o expirado', error instanceof Error ? error.message : error);
    }
  }
}
