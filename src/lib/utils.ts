import { ApiError } from "./api/http";
import type { User } from "./api/types";
import type { AliasMap } from "./api/aliases";

// ─── Patrones de errores técnicos ─────────────────────────────────────────────

const TECHNICAL_ERROR_PATTERNS = [
  /invalid input value for enum/i,
  /enum_[a-z0-9_]+/i,
  /\bsequelize\b/i,
  /\bsyntax error\b/i,
  /\brelation\b.+\bdoes not exist\b/i,
  /\bcolumn\b.+\bdoes not exist\b/i,
  /\bconstraint\b/i,
  /\bduplicate key\b/i,
  /\bviolates\b/i,
  /\bsql\b/i,
  /\bquery\b/i,
  /\bstack\b/i,
  /network request failed/i,
  /failed to fetch/i,
  /unexpected token/i,
  /^application not found$/i,
  /^not found$/i,
  /^bad gateway$/i,
  /^service unavailable$/i,
  /^gateway timeout$/i,
  /^internal server error$/i,
];

function isTechnicalMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (trimmed.length > 220) return true;
  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;
  if (/(\bat\b.+:\d+:\d+)|\n/.test(trimmed)) return true;
  return false;
}

/**
 * Extrae el mensaje de error user-facing de cualquier tipo de error.
 * Filtra errores técnicos (SQL, stacks, etc.) y devuelve el defaultMessage.
 */
export function getErrorMessage(error: unknown, defaultMessage: string): string {
  const rawMessage =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : null;

  if (!rawMessage) return defaultMessage;
  return isTechnicalMessage(rawMessage) ? defaultMessage : rawMessage;
}

/**
 * Verifica si un usuario es coach (role_id === 2).
 */
export function isCoach(user: Pick<User, "role_id"> | null | undefined): boolean {
  return user?.role_id === 2;
}

/**
 * Formatea una fecha como "3 ene", "15 oct", etc.
 */
export function formatShortDate(date: Date): string {
  const day = date.getDate();
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const month = months[date.getMonth()];
  return `${day} ${month}`;
}

/**
 * Capitaliza la primera letra de una cadena.
 */
export function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Devuelve las iniciales de un usuario para usar en Avatar.
 * Intenta usar first_name + last_name; si no, username; si no, "?".
 */
export function getUserInitials(user: Pick<User, "first_name" | "last_name" | "username">): string {
  const first = user.first_name?.trim();
  const last = user.last_name?.trim();

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }
  if (first) {
    return first.slice(0, 2).toUpperCase();
  }
  if (user.username) {
    return user.username.slice(0, 2).toUpperCase();
  }
  return "?";
}

/**
 * Shape mínima de usuario necesaria para resolución de nombre.
 * `id` es opcional para mantener compatibilidad con el usuario propio (no debe
 * resolver aliases sobre sí mismo).
 */
export interface UserLike {
  id?: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
}

/**
 * Devuelve el nombre completo (first + last) del usuario, o null si no tiene.
 */
export function getFullName(user: Pick<UserLike, "first_name" | "last_name">): string | null {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return full || null;
}

/**
 * Devuelve el nombre para mostrar de un usuario con prioridad:
 *   alias (si se provee mapa) > nombre completo > username
 */
export function getDisplayName(user: UserLike, aliases?: AliasMap): string {
  const alias = user.id != null ? aliases?.[user.id] : undefined;
  if (alias) return alias;
  return getFullName(user) ?? user.username ?? "Usuario";
}

/**
 * Devuelve el subtítulo (línea secundaria) de un usuario.
 * Cuando hay alias → muestra nombre completo · @username (o solo @username).
 * Cuando hay nombre completo → muestra @username.
 * Cuando solo hay username → null.
 */
export function getDisplaySubtitle(user: UserLike, aliases?: AliasMap): string | null {
  const alias = user.id != null ? aliases?.[user.id] : undefined;
  const fullName = getFullName(user);
  if (alias) {
    return fullName ? `${fullName} · ${user.username}` : (user.username ?? null);
  }
  if (fullName) return user.username ?? null;
  return null;
}
