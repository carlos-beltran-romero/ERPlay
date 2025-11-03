/**
 * @module config/mailer
 */
import nodemailer from 'nodemailer';

import { env } from './env';

const baseOptions: nodemailer.TransportOptions = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: true,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
};

/**
 * Genera un transporte de nodemailer reutilizando la configuración SMTP.
 * @public
 */
export function createMailer(options: nodemailer.TransportOptions = {}) {
  const merged = {
    ...baseOptions,
    ...options,
    auth: {
      ...baseOptions.auth,
      ...(options.auth as nodemailer.AuthOptions | undefined),
    },
  } satisfies nodemailer.TransportOptions;

  return nodemailer.createTransport(merged);
}

/**
 * Transporte por defecto para operaciones de correo síncronas.
 * @public
 */
export const defaultMailer = createMailer();
