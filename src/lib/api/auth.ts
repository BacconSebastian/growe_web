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
  return httpFetch<User>("/auth/me", {
    method: "GET",
    accessToken,
  });
}
