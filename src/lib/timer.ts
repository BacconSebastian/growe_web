/**
 * timer.ts — utilidades de formato para descansos (MM:SS). Espejo de mobile/lib/timer.ts.
 */

/** Segundos → "MM:SS". */
export const formatTimerTime = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Parsea un input de tiempo a segundos.
 * - "MM:SS" explícito → mins*60+secs.
 * - Solo dígitos → se interpretan como MMSS (derecha-alineado): "30"→30s, "130"→1:30, "90"→90s.
 */
export const parseTimerInput = (input: string, fallback = 0): number => {
  const cleaned = input.replace(/[^0-9:]/g, "").trim();
  if (!cleaned) return fallback;

  if (cleaned.includes(":")) {
    const [minPart = "", secPart = ""] = cleaned.split(":");
    const mins = parseInt(minPart || "0", 10) || 0;
    const secs = parseInt(secPart || "0", 10) || 0;
    return Math.max(0, mins * 60 + secs);
  }

  const num = cleaned.slice(0, 4).padStart(4, "0");
  const mins = parseInt(num.slice(0, 2), 10);
  const secs = parseInt(num.slice(2, 4), 10);
  return Math.max(0, mins * 60 + secs);
};
