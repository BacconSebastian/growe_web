import { httpFetch } from "./http";
import type { AuthPayload, AuthTokens, User } from "./types";

interface LoginDto {
  identifier: string;
  password: string;
}

/**
 * Inicia sesión con email/username + contraseña.
 * Devuelve el payload completo con user + tokens.
 */
export async function login(dto: LoginDto): Promise<AuthPayload> {
  return httpFetch<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify(dto),
    skipRefresh: true, // en login no hay token vigente, no hay nada que refrescar
  });
}

/**
 * Refresca el accessToken usando el refreshToken.
 * Usado internamente por httpFetch; también se puede llamar directamente.
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const payload = await httpFetch<AuthPayload>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    skipRefresh: true,
  });
  return { accessToken: payload.accessToken, refreshToken: payload.refreshToken };
}

/**
 * Obtiene el perfil del usuario autenticado.
 * Sirve para validar tokens al bootear la app.
 */
export async function getMe(accessToken: string): Promise<User> {
  // El backend expone GET /auth/profile (no /auth/me) para el usuario autenticado.
  return httpFetch<User>("/auth/profile", {
    method: "GET",
    accessToken,
  });
}

interface ForgotPasswordDto {
  email: string;
}

interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

/**
 * Solicita un email de recuperación de contraseña.
 * El backend siempre responde con un mensaje genérico para no revelar si el email existe.
 */
export async function forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
  return httpFetch<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(dto),
    skipRefresh: true, // endpoint público, no hay token que refrescar
  });
}

/**
 * Restablece la contraseña usando el token recibido por email.
 * El token expira en 1 hora.
 * Reglas de contraseña: mínimo 6 caracteres, al menos una mayúscula, una minúscula y un número.
 */
export async function resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
  return httpFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(dto),
    skipRefresh: true, // endpoint público, no hay token que refrescar
  });
}
