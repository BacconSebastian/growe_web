export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

/** Clave en localStorage para almacenar { user, accessToken, refreshToken } */
export const AUTH_STORAGE_KEY = "growe.web.auth";

/** Clave en localStorage para almacenar el tema activo */
export const THEME_STORAGE_KEY = "growe.web.theme";
