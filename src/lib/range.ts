/**
 * range.ts
 *
 * Helpers para rangos de variables de ejercicio (reps, peso, RIR, segundos).
 * Un rango se representa como { min, max? } donde max === null significa valor único.
 *
 * Twin del backend: mantener 1:1 con backend/src/utils/range.js
 */

export function parseRange(
  input: string | null | undefined,
): { min: number; max: number | null } | null {
  if (input == null || input === "") return null;

  const trimmed = input.trim();
  if (trimmed === "") return null;

  const dashIdx = trimmed.lastIndexOf("-");

  if (dashIdx > 0) {
    const minPart = trimmed.slice(0, dashIdx).trim();
    const maxPart = trimmed.slice(dashIdx + 1).trim();

    const min = Number(minPart);
    const max = Number(maxPart);

    if (
      minPart === "" ||
      maxPart === "" ||
      isNaN(min) ||
      isNaN(max) ||
      !isFinite(min) ||
      !isFinite(max)
    ) {
      return null;
    }

    if (max < min) return null;

    return { min, max };
  }

  const single = Number(trimmed);
  if (isNaN(single) || !isFinite(single)) return null;

  return { min: single, max: null };
}

export function formatRange(
  min: number | null | undefined,
  max?: number | null,
): string {
  if (min == null || isNaN(min) || !isFinite(min)) return "";
  if (max != null && !isNaN(max) && isFinite(max) && max !== min) {
    return `${min}-${max}`;
  }
  return String(min);
}

export function isInRange(
  value: number,
  min: number,
  max?: number | null,
): boolean {
  if (max == null) return value === min;
  return value >= min && value <= max;
}

export function compareToRange(
  value: number,
  min: number,
  max?: number | null,
): -1 | 0 | 1 {
  if (max == null) {
    if (value > min) return 1;
    if (value < min) return -1;
    return 0;
  }
  if (value < min) return -1;
  if (value > max) return 1;
  return 0;
}
