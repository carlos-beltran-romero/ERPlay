/**
 * Módulo de servicios de autenticación
 * Gestiona login, logout, recuperación de contraseña y renovación de tokens
 * @module services/auth
 */

import { apiJson, apiRequest, clearTokens, setTokens } from "./http";
import { clearProfileCache } from "./authCache";

/** Respuesta del servidor tras login/refresh exitoso */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Inicia sesión con email y contraseña
 * Almacena tokens JWT en localStorage
 *
 * @param email - Email del usuario
 * @param password - Contraseña en texto plano
 * @returns Tokens de acceso y refresco
 * @throws {Error} Si las credenciales son incorrectas o el servidor falla
 * @remarks
 * - Tokens se guardan automáticamente via setTokens()
 * - credentials: 'include' envía cookies si el servidor las usa
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const data = await apiJson<LoginResponse>("/api/auth/login", {
    method: "POST",
    json: { email, password },
    credentials: "include",
    fallbackError: "Credenciales incorrectas",
  });

  setTokens(data.accessToken, data.refreshToken);
  return data;
}

/**
 * Solicita enlace de recuperación de contraseña
 * El servidor envía email con token de un solo uso
 *
 * @param email - Email del usuario registrado
 * @throws {Error} Si el email no existe o el envío falla
 * @remarks
 * - No revela si el email existe (seguridad)
 * - Token expira según configuración del servidor (típicamente 1h)
 */
export async function forgotPassword(email: string): Promise<void> {
  await apiJson<void>("/api/auth/forgot-password", {
    method: "POST",
    json: { email },
    fallbackError: "Error al enviar enlace de recuperación",
  });
}

/**
 * Restablece contraseña usando token de recuperación
 * Valida token de un solo uso recibido por email
 *
 * @param token - Token de recuperación (desde URL del email)
 * @param password - Nueva contraseña
 * @throws {Error} Si el token expiró, es inválido o la contraseña no cumple requisitos
 * @remarks
 * - Token se invalida tras uso exitoso
 * - Requisitos de contraseña: mínimo 6 caracteres (configurable en backend)
 */
export async function resetPassword(
  token: string,
  password: string
): Promise<void> {
  await apiJson<void>("/api/auth/reset-password", {
    method: "POST",
    json: { token, newPassword: password },
    fallbackError: "Error al restablecer contraseña",
  });
}

/**
 * Cierra sesión del usuario
 * Invalida refresh token en servidor y limpia tokens locales
 *
 * @remarks
 * - Ignora errores de red (no debe bloquear cierre de sesión)
 * - clearTokens() se ejecuta en finally para garantizar limpieza local
 * - Redirección a login debe manejarse en el caller
 */
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem("refreshToken");

  try {
    if (refreshToken) {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        auth: true,
        json: { refreshToken },
        fallbackError: "No se pudo cerrar sesión",
      });
    }
  } catch {
    // Ignorar errores (logout siempre debe completarse)
  } finally {
    clearTokens();
    clearProfileCache();
  }
}

/**
 * Renueva el access token usando refresh token
 * Llamado automáticamente por http.ts cuando detecta 401
 *
 * @returns Nuevo access token
 * @throws {Error} Si el refresh token expiró o es inválido
 * @remarks
 * - Refresh token tiene mayor TTL que access token (7d vs 15m típicamente)
 * - Si falla, el usuario debe hacer login nuevamente
 * - Nuevos tokens reemplazan los anteriores en localStorage
 */
export async function refresh() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No hay refresh token");

  const data = await apiJson<LoginResponse>("/api/auth/refresh", {
    method: "POST",
    json: { refreshToken },
    credentials: "include",
    fallbackError: "No se pudo refrescar sesión",
  });

  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}
