/**
 * @module config/env
 * Normaliza las variables públicas de entorno para el cliente.
 */

const rawApiUrl = (import.meta.env?.VITE_API_URL ?? "").toString().trim();

if (!rawApiUrl) {
  throw new Error("VITE_API_URL es obligatorio para inicializar la aplicación");
}

export const env = {
  /** URL base del backend. */
  API_URL: rawApiUrl.replace(/\/+$/, ""),
} as const;

export type Env = typeof env;
