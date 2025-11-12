/**
 * @module back/config/env
 * Configuración centralizada de variables de entorno.
 */
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    PORT: z.coerce.number().int().positive().optional(),
    FRONTEND_URL: z.string().trim().optional(),
    PUBLIC_API_BASE_URL: z.string().trim().optional(),
    APP_URL: z.string().trim().optional(),
    DB_HOST: z.string().min(1, 'DB_HOST es obligatorio'),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1, 'DB_USER es obligatorio'),
    DB_PASSWORD: z.string().optional(),
    DB_NAME: z.string().min(1, 'DB_NAME es obligatorio'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET es obligatorio'),
    JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET es obligatorio'),
    JWT_RESET_SECRET: z.string().min(1, 'JWT_RESET_SECRET es obligatorio'),
    SMTP_HOST: z.string().min(1, 'SMTP_HOST es obligatorio'),
    SMTP_PORT: z.coerce.number().int().positive().default(465),
    SMTP_USER: z.string().min(1, 'SMTP_USER es obligatorio'),
    SMTP_PASS: z.string().min(1, 'SMTP_PASS es obligatorio'),
    SMTP_FROM: z.string().trim().optional(),
    SUPERVISOR_NOTIFY_EMAIL: z.string().trim().optional(),
  })
  .transform((raw) => ({
    ...raw,
    NODE_ENV: raw.NODE_ENV ?? 'development',
  }));

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  const formattedErrors = parseResult.error.issues
    .map((error) => `${error.path.join('.')}: ${error.message}`)
    .join('\n');
  throw new Error(`Variables de entorno inválidas:\n${formattedErrors}`);
}

/**
 * Configuración fuertemente tipada obtenida de las variables de entorno.
 * @public
 */
export const env = parseResult.data;

export type AppEnvironment = typeof env;
