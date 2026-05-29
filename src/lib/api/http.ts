/**
 * httpFetch — cliente HTTP del panel web de Growe.
 *
 * Diferencias con el mobile:
 * - Persiste tokens en localStorage (no AsyncStorage).
 * - No tiene fallback URL (solo un endpoint de producción).
 * - No tiene demo mode.
 *
 * Flujo de refresh:
 * 1. Inyecta Authorization: Bearer {accessToken} en cada request.
 * 2. Si recibe 401, intenta POST /auth/refresh con el refreshToken de localStorage.
 * 3. Si el refresh funciona, guarda los nuevos tokens y reintenta el original.
 * 4. Si el refresh falla, dispara evento auth:expired → AuthContext hace logout.
 */

import { API_BASE_URL, AUTH_STORAGE_KEY } from "./config";
import type { ApiResponse, AuthPayload } from "./types";
import { notifyTokenExpired } from "./auth-events";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface FetchOptions extends RequestInit {
  /** Si false, no parsea JSON (útil para respuestas binarias). Default: true. */
  parseJson?: boolean;
  /** Si true, usa `input` como URL completa sin anteponer API_BASE_URL. */
  skipBaseUrl?: boolean;
  /** Timeout en ms. Default: 20000. */
  timeoutMs?: number;
  /** Access token a inyectar. Si no se pasa, se lee de localStorage. */
  accessToken?: string;
  /** Si true, no intenta refresh en 401 (evita loops). */
  skipRefresh?: boolean;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/** Lee el accessToken actual de localStorage. */
function getStoredTokens(): { accessToken: string; refreshToken: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { accessToken?: string; refreshToken?: string };
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
  } catch {
    return null;
  }
}

/** Actualiza sólo los tokens en localStorage, preservando el objeto `user`. */
function storeTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ ...current, accessToken, refreshToken })
    );
  } catch {
    // Si localStorage falla (modo privado, etc.) seguimos adelante
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}

function extractApiErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  if ("message" in body) {
    const msg = (body as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }

  if ("error" in body && body.error && typeof body.error === "object") {
    const msg = (body.error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }

  return null;
}

async function attemptRefresh(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<AuthPayload>;
    if (!body.success || !body.data) return null;

    const { accessToken, refreshToken } = body.data;
    storeTokens(accessToken, refreshToken);
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

export async function httpFetch<T>(input: string, init?: FetchOptions): Promise<T> {
  const {
    parseJson = true,
    skipBaseUrl = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    accessToken: explicitToken,
    skipRefresh = false,
    headers,
    signal: externalSignal,
    ...rest
  } = init ?? {};

  const url = skipBaseUrl ? input : `${API_BASE_URL}${input.startsWith("/") ? "" : "/"}${input}`;

  // Resuelve el token: prioriza el explícito, si no lee de localStorage
  const token = explicitToken ?? getStoredTokens()?.accessToken;

  const builtHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (token) {
    builtHeaders["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, { ...rest, headers: builtHeaders }, timeoutMs, externalSignal ?? undefined);
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (isAbort && externalSignal?.aborted) throw err;
    if (isAbort) throw new ApiError("La solicitud tardó demasiado", 408, null);
    throw new ApiError("Error de red. Verificá tu conexión.", 0, null);
  }

  // Manejo de 401: intento de refresh + reintento
  if (response.status === 401 && !skipRefresh) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      // Reintento con el nuevo token
      return httpFetch<T>(input, {
        ...init,
        accessToken: refreshed.accessToken,
        skipRefresh: true,
      });
    }
    // Refresh falló → logout
    notifyTokenExpired();
    throw new ApiError("Tu sesión expiró. Volvé a iniciar sesión.", 401, null);
  }

  if (!parseJson) {
    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(text || response.statusText, response.status, text);
    }
    return response as unknown as T;
  }

  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("Respuesta inválida del servidor", response.status, null);
  }

  if (!response.ok || ("success" in body && body.success === false)) {
    const message =
      extractApiErrorMessage(body) ?? response.statusText ?? "Error en la solicitud";

    // 403 por email no verificado → también fuerza logout
    if (response.status === 403 && message.toLowerCase().includes("email no verificado")) {
      notifyTokenExpired();
    }

    throw new ApiError(message, response.status, body);
  }

  if (!("success" in body) || !body.success) {
    throw new ApiError("Respuesta de API inesperada", response.status, body);
  }

  return ("data" in body ? body.data : undefined) as T;
}
