/**
 * Sistema de eventos para manejar errores de autenticación.
 * Permite que httpFetch notifique cuando el token está expirado
 * y que AuthContext reaccione automáticamente.
 */

type AuthErrorCallback = () => void;

let onTokenExpiredCallback: AuthErrorCallback | null = null;

/**
 * Registra un callback que se ejecutará cuando el token expire.
 */
export function setOnTokenExpired(callback: AuthErrorCallback | null): void {
  onTokenExpiredCallback = callback;
}

/**
 * Notifica que el token expiró.
 * Llamado por httpFetch cuando detecta 401 con mensaje de token expirado.
 */
export function notifyTokenExpired(): void {
  if (onTokenExpiredCallback) {
    onTokenExpiredCallback();
  }
}
