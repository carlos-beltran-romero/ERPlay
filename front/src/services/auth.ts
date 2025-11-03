import { apiJson, apiRequest, clearTokens, setTokens } from './http';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await apiJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    json: { email, password },
    credentials: 'include',
    fallbackError: 'Credenciales incorrectas',
  });

  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiJson<void>('/api/auth/forgot-password', {
    method: 'POST',
    json: { email },
    fallbackError: 'Error al enviar enlace de recuperación',
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiJson<void>('/api/auth/reset-password', {
    method: 'POST',
    json: { token, newPassword: password },
    fallbackError: 'Error al restablecer contraseña',
  });
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');

  try {
    if (refreshToken) {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        auth: true,
        json: { refreshToken },
        fallbackError: 'No se pudo cerrar sesión',
      });
    }
  } catch {
    // Ignorar errores de logout (no debe bloquear la salida).
  } finally {
    clearTokens();
  }
}

export async function refresh() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No hay refresh token');

  const data = await apiJson<LoginResponse>('/api/auth/refresh', {
    method: 'POST',
    json: { refreshToken },
    credentials: 'include',
    fallbackError: 'No se pudo refrescar sesión',
  });

  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}
