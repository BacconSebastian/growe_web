/**
 * superset.ts — Helpers de retrocompat para logs históricos con supersets legacy.
 *
 * El modelo NUEVO usa filas independientes con `superset_group` UUID compartido.
 * Los helpers canónicos del nuevo modelo viven en `lib/superset-grouping.ts`.
 *
 * Este módulo provee ÚNICAMENTE el mapper de lectura defensivo para snapshots
 * de RoutineLog con `exercise_type='superset'` y `alias` en sets_data —
 * datos históricos de SOLO lectura generados antes del refactor.
 *
 * @see mobile/lib/superset.ts — espejo de referencia (no 1:1: web no usa expo-crypto)
 */

// ─── Tipos del modelo legacy (read-only) ─────────────────────────────────────

/**
 * Letra canónica de alias legacy (A / B / C).
 * Solo aplica a datos históricos con exercise_type='superset'.
 */
type AliasLetter = "A" | "B" | "C";

/**
 * Extrae la letra canónica del alias.
 * Maneja formato "A" o "A - Nombre".
 * Fallback defensivo: "A".
 */
export function aliasLetter(alias: string): AliasLetter {
  const first = alias.charAt(0).toUpperCase();
  if (first === "A" || first === "B" || first === "C") return first;
  return "A";
}

/**
 * Extrae letra y nombre extra de un alias legacy "A - Foo".
 * Si ya es solo letra, devuelve { letter, name: "" }.
 */
export function splitLegacyAlias(raw: string): { letter: AliasLetter; name: string } {
  const letter = aliasLetter(raw);
  const sep = " - ";
  const idx = raw.indexOf(sep);
  if (idx === -1) return { letter, name: "" };
  return { letter, name: raw.slice(idx + sep.length).trim() };
}

/**
 * Shape mínima de un set de superset legacy leído desde la API
 * (sets_data de un ejercicio con exercise_type='superset').
 */
export interface LegacySupersetSetRaw {
  alias?: string | null;
  exercise_id?: number | null;
  exercise_name?: string | null;
  reps?: number | null;
  reps_max?: number | null;
  weight_kg?: number | null;
  weight_kg_max?: number | null;
  rir?: number | null;
  rir_max?: number | null;
  seconds?: number | null;
  seconds_max?: number | null;
  distance_m?: number | null;
  calories?: number | null;
  bricks?: number | null;
  rpe?: number | null;
  rest_time?: number | null;
  custom?: Record<string, number> | null;
}

/**
 * Normaliza los sets de un ejercicio legacy superset
 * (exercise_type='superset' con `alias` en sets_data).
 *
 * - Extrae la letra canónica del alias (A/B/C).
 * - Recupera exercise_name del campo legacy "A - Nombre" si no hay campo explícito.
 * - Idempotente: si el set ya tiene alias letra limpia y exercise_name, pasa sin cambios.
 *
 * Portado 1:1 desde `mobile/lib/superset.ts#migrateLegacySupersetSets`.
 * Solo diferencia: devuelve el raw normalizado (no convierte a strings de input).
 */
export function migrateLegacySupersetSets(
  sets: LegacySupersetSetRaw[],
): LegacySupersetSetRaw[] {
  return sets.map((s) => {
    const rawAlias = typeof s.alias === "string" ? s.alias : "A";
    const { letter, name } = splitLegacyAlias(rawAlias);
    return {
      ...s,
      alias: letter,
      exercise_id: s.exercise_id ?? null,
      exercise_name: s.exercise_name ?? name,
    };
  });
}

/**
 * Agrupa sets legacy (ya normalizados) por alias letter.
 * Devuelve un Map<AliasLetter, LegacySupersetSetRaw[]>.
 * Útil para renderizar rondas intercaladas de datos históricos.
 */
export function groupLegacySetsByAlias(
  sets: LegacySupersetSetRaw[],
): Map<AliasLetter, LegacySupersetSetRaw[]> {
  const result = new Map<AliasLetter, LegacySupersetSetRaw[]>();
  for (const s of sets) {
    const letter = aliasLetter(s.alias ?? "A");
    if (!result.has(letter)) result.set(letter, []);
    result.get(letter)!.push(s);
  }
  return result;
}
