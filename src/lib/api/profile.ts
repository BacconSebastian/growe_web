/**
 * profile.ts — API de perfil del coach.
 */

import { httpFetch } from "./http";
import { API_BASE_URL, AUTH_STORAGE_KEY } from "./config";
import type { User } from "./types";

export async function getProfile(): Promise<User> {
  return httpFetch<User>("/auth/profile");
}

export async function updateProfile(payload: Partial<User>): Promise<User> {
  return httpFetch<User>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(params: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await httpFetch<unknown>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * uploadAvatar — usa fetch directo (multipart).
 * Inyecta manualmente el Bearer token.
 */
export async function uploadAvatar(formData: FormData): Promise<User> {
  let accessToken: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { accessToken?: string };
        accessToken = parsed.accessToken ?? null;
      }
    } catch {
      // ignorar
    }
  }

  const res = await fetch(`${API_BASE_URL}/auth/avatar`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body?.error?.message ?? "Error al subir el avatar");
  }

  const body = await res.json() as { success: boolean; data?: User };
  if (!body.success || !body.data) {
    throw new Error("Error al subir el avatar");
  }
  return body.data;
}

export async function deleteAvatar(): Promise<void> {
  await httpFetch<unknown>("/auth/avatar", { method: "DELETE" });
}

export async function logout(): Promise<void> {
  await httpFetch<unknown>("/auth/logout", { method: "POST" });
}

export async function deleteAccount(params: { password: string }): Promise<void> {
  await httpFetch<unknown>("/auth/account", {
    method: "DELETE",
    body: JSON.stringify(params),
  });
}
