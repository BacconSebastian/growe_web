/**
 * exercise-value-fill.ts — Helpers de relleno de valores de series para el editor web.
 *
 * TWIN FILE (semántica): portado de la lógica de:
 *   - `pasteLastTrainedValues` en `mobile/components/planning/PlanningRoutinesStep.tsx`
 *   - `copyPreviousWeekValues` en `mobile/components/planning/PlanningRoutinesStep.tsx`
 *   - `resolveExecutedSetsForGroup` / `buildSnapshotKeyIndex` /
 *     `buildProgressByOrderIndex` en `mobile/lib/exercise-matching.ts`
 *
 * Mantener la semántica sincronizada con esas fuentes.
 *
 * Diferencias respecto al modelo mobile:
 * - Los bloques son `ExerciseBlockData[]` (editor web) en lugar de `ExerciseBlock[]`.
 * - Los sets son `EditableSet` (strings para campos numéricos) en lugar de
 *   `ExerciseSet` (strings) / `SupersetSet`.
 * - No existe el modelo legacy de supersets (alias en una sola fila); los supersets
 *   son filas independientes con `superset_group`.
 * - `fillFromLastLog` mapea `weight` → `weight_kg` (el log guarda `weight` como
 *   campo directo, el editor usa `weight_kg`).
 *
 * @module lib/exercise-value-fill
 */

import type { ExerciseBlockData } from "@/components/routines/ExerciseBlock";
import type { EditableSet } from "@/components/routines/SetsTable";
import { routineSetToEditable } from "@/components/routines/SetsTable";
import { resolveVariablesConfig } from "@/lib/exercise-presets";
import type { PlanningWeekRoutineExercise, RoutineExerciseSet } from "@/lib/api/types";

// ─── Tipos de entrada ─────────────────────────────────────────────────────────

/**
 * Un set ejecutado tal como aparece en `RoutineLog.routine_snapshot.workout_progress[n].setLogs`.
 * El campo `weight` (no `weight_kg`) es el valor registrado durante el workout.
 */
export interface ExecutedSetEntry {
  reps: number;
  /** Peso en kg. Nota: el log lo expone como `weight` (no `weight_kg`). */
  weight: number;
  rir: number;
  completed: boolean;
  seconds?: number;
  distance_m?: number;
  calories?: number;
  bricks?: number;
  rpe?: number;
  /** Presente en logs legacy de supersets de alias. */
  alias?: string | null;
  /** Variables custom namespaced. */
  custom?: Record<string, number> | null;
}

/**
 * Una entrada de progreso de un ejercicio dentro del workout_progress.
 */
export interface WorkoutProgressEntry {
  /** Corresponde al order_index del ejercicio en el snapshot de la rutina. */
  orderIndex: number;
  variantId?: number | null;
  exerciseId?: number | null;
  setLogs: ExecutedSetEntry[];
}

/**
 * Subset del routine_snapshot necesario para `fillFromLastLog`.
 * Compatible con `RoutineLog.routine_snapshot` de `web/src/lib/api/types.ts`.
 */
export interface RoutineSnapshotForFill {
  exercises?: Array<{
    id: number;
    name: string;
    exercise_id?: number | null;
    order_index: number;
    is_warmup?: boolean;
  }>;
  workout_progress?: WorkoutProgressEntry[] | null;
}

// ─── fillFromLastLog ───────────────────────────────────────────────────────────

/**
 * Rellena los valores de las series de cada bloque con los valores ejecutados en el
 * último entrenamiento (último `RoutineLog`).
 *
 * Algoritmo (1:1 con mobile `pasteLastTrainedValues`):
 * - Match de ejercicio: occurrence-aware por `(exercise_id | name_normalizado, is_warmup)`.
 *   La k-ésima ocurrencia de la misma key en los bloques mapea a la k-ésima
 *   ocurrencia en el snapshot.
 * - Match de serie: por índice posicional. Si el log tiene menos series que el
 *   plan, las series sobrantes del plan se preservan intactas.
 * - Colapsa rangos: los campos `*_max` del editable set resultante quedan sin
 *   efecto (EditableSet no los tiene; la conversión a string ya los descarta).
 * - Variables custom: merge preservando las que ya estaban en el plan
 *   (el log puede sobreescribir valores; el plan mantiene las que el log omite).
 * - Series sin counterpart en el log → se preservan intactas.
 * - Bloques sin match en el snapshot → se preservan intactos.
 * - El campo `weight` del log se mapea a `weight_kg` del EditableSet.
 *
 * @param blocks          Array de bloques editable. No se muta.
 * @param routineSnapshot Snapshot del último RoutineLog (`routine_snapshot`).
 * @returns Nueva copia del array con los valores del log aplicados.
 */
export function fillFromLastLog(
  blocks: ExerciseBlockData[],
  routineSnapshot: RoutineSnapshotForFill,
): ExerciseBlockData[] {
  const snapshotExercises = routineSnapshot.exercises ?? [];
  const workoutProgress = routineSnapshot.workout_progress ?? [];

  if (snapshotExercises.length === 0 || workoutProgress.length === 0) {
    return blocks;
  }

  // Construir índice: key → ejercicios del snapshot ordenados por order_index
  const keyIndex = buildSnapshotKeyIndex(snapshotExercises);
  // Construir mapa: order_index → WorkoutProgressEntry
  const progressByOrder = buildProgressByOrderIndex(workoutProgress);

  // Construir la lista de "query items" a partir de los bloques
  const queryItems = blocks.map((b) => ({
    exerciseId: b.exercise_id,
    name: b.name,
    isWarmup: b.is_warmup,
  }));

  return blocks.map((block, gIdx) => {
    const executedSets = resolveExecutedSetsForGroup(
      queryItems,
      gIdx,
      keyIndex,
      progressByOrder,
    );
    if (!executedSets || executedSets.length === 0) return block;

    const newSets = block.sets.map((plannedSet, sIdx) => {
      const exec = executedSets[sIdx];
      if (!exec) return plannedSet;
      return mergeExecutedIntoEditableSet(plannedSet, exec);
    });

    return { ...block, sets: newSets };
  });
}

// ─── fillFromPreviousWeek ──────────────────────────────────────────────────────

/**
 * Rellena los valores de las series de cada bloque con los valores planificados en
 * los ejercicios de la semana anterior (snapshot N-1).
 *
 * Algoritmo (1:1 con mobile `copyPreviousWeekValues` — fuente: prop previousWeekRoutines):
 * - Match de ejercicio por firma: `exercise_id` preferido; si null, por nombre
 *   normalizado (lowercase trim); fallback posicional si ninguno matchea.
 * - Matching occurrence-aware: la k-ésima ocurrencia de la misma key en los bloques
 *   mapea a la k-ésima ocurrencia en `prevExercises`.
 * - Los valores se copian VERBATIM desde el snapshot anterior (a través de
 *   `routineSetToEditable`). Los rangos (`*_max`) que pudieran existir en el
 *   backend se pierden en la conversión a EditableSet, que es el comportamiento
 *   esperado por el editor.
 * - Bloques sin match en prevExercises → se preservan intactos.
 *
 * @param blocks        Array de bloques editable. No se muta.
 * @param prevExercises Ejercicios del snapshot de la rutina equivalente de la semana N-1.
 * @returns Nueva copia del array con los valores del snapshot anterior aplicados.
 */
export function fillFromPreviousWeek(
  blocks: ExerciseBlockData[],
  prevExercises: PlanningWeekRoutineExercise[],
): ExerciseBlockData[] {
  if (prevExercises.length === 0) return blocks;

  // Construir índice de ejercicios anteriores por firma
  const prevKeyIndex = buildPrevExercisesKeyIndex(prevExercises);

  // Tracking de ocurrencias en bloques actuales
  const currentOccurrences = new Map<string, number>();

  return blocks.map((block) => {
    const key = makeExerciseKey(block.exercise_id, block.name, block.is_warmup);

    // Obtener la ocurrencia actual de esta key en los bloques ya procesados
    const occ = key != null ? (currentOccurrences.get(key) ?? 0) : 0;
    if (key != null) currentOccurrences.set(key, occ + 1);

    // Buscar el ejercicio de la semana anterior correspondiente
    const prevEx = key != null
      ? (prevKeyIndex.get(key)?.[occ] ?? null)
      : null;

    if (!prevEx || !prevEx.sets_data || prevEx.sets_data.length === 0) {
      return block;
    }

    const config = resolveVariablesConfig(
      prevEx.variables_config ?? null,
      prevEx.exercise_type ?? "weight",
    );

    const newSets = prevEx.sets_data.map((rawSet) =>
      routineSetToEditable(rawSet as RoutineExerciseSet, config),
    );

    // Si el bloque actual tiene más series que el anterior, rellenar con la última
    const filledSets: EditableSet[] = [];
    for (let i = 0; i < block.sets.length; i++) {
      const src = newSets[i] ?? newSets[newSets.length - 1];
      filledSets.push(src ? { ...src } : { ...block.sets[i] });
    }

    return { ...block, sets: filledSets };
  });
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Construye la clave canónica de matching para un ejercicio.
 * Prefiere `exercise_id` sobre nombre normalizado; cualifica con `is_warmup`.
 * Retorna null si no hay exercise_id ni nombre.
 */
function makeExerciseKey(
  exerciseId: number | null | undefined,
  name: string | null | undefined,
  isWarmup: boolean,
): string | null {
  const w = isWarmup ? "1" : "0";
  if (exerciseId != null) return `id:${exerciseId}|w:${w}`;
  const n = name?.trim().toLowerCase() ?? "";
  if (!n) return null;
  return `name:${n}|w:${w}`;
}

/**
 * Construye un mapa de key → lista de snapshot exercises ordenados por order_index.
 * 1:1 con `buildSnapshotKeyIndex` de `mobile/lib/exercise-matching.ts`.
 */
function buildSnapshotKeyIndex(
  snapshotExercises: NonNullable<RoutineSnapshotForFill["exercises"]>,
): Map<string, typeof snapshotExercises> {
  const sorted = [...snapshotExercises].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );
  const map = new Map<string, typeof snapshotExercises>();
  for (const ex of sorted) {
    const key = makeExerciseKey(ex.exercise_id ?? null, ex.name, ex.is_warmup ?? false);
    if (!key) continue;
    const arr = map.get(key) ?? [];
    arr.push(ex);
    map.set(key, arr);
  }
  return map;
}

/**
 * Construye un mapa de order_index → WorkoutProgressEntry para lookup O(1).
 * 1:1 con `buildProgressByOrderIndex` de `mobile/lib/exercise-matching.ts`.
 */
function buildProgressByOrderIndex(
  workoutProgress: WorkoutProgressEntry[],
): Map<number, WorkoutProgressEntry> {
  const map = new Map<number, WorkoutProgressEntry>();
  for (const p of workoutProgress) {
    map.set(p.orderIndex, p);
  }
  return map;
}

/**
 * Resuelve los sets ejecutados del ejercicio en `groupIndex` dentro de la lista
 * de query items, usando matching occurrence-aware por key.
 * 1:1 con `resolveExecutedSetsForGroup` de `mobile/lib/exercise-matching.ts`.
 */
function resolveExecutedSetsForGroup(
  queryItems: Array<{
    exerciseId: number | null | undefined;
    name: string | null | undefined;
    isWarmup: boolean;
  }>,
  groupIndex: number,
  snapshotKeyIndex: Map<
    string,
    NonNullable<RoutineSnapshotForFill["exercises"]>
  >,
  progressByOrder: Map<number, WorkoutProgressEntry>,
): ExecutedSetEntry[] | null {
  const editorOccurrence = new Map<string, number>();
  let matchedEx:
    | NonNullable<RoutineSnapshotForFill["exercises"]>[number]
    | undefined;

  for (let i = 0; i <= groupIndex && i < queryItems.length; i++) {
    const item = queryItems[i];
    if (!item) continue;
    const key = makeExerciseKey(item.exerciseId, item.name, item.isWarmup);
    const occ = editorOccurrence.get(key ?? "") ?? 0;
    if (key) editorOccurrence.set(key, occ + 1);
    if (i === groupIndex && key) {
      const candidates = snapshotKeyIndex.get(key) ?? [];
      matchedEx = candidates[occ];
    }
  }

  if (!matchedEx) return null;
  const progress = progressByOrder.get(matchedEx.order_index);
  if (!progress || !progress.setLogs || progress.setLogs.length === 0)
    return null;
  return progress.setLogs;
}

/**
 * Construye un índice de ejercicios de la semana anterior por clave canónica.
 * Preserva el orden original del array para el matching occurrence-aware.
 */
function buildPrevExercisesKeyIndex(
  prevExercises: PlanningWeekRoutineExercise[],
): Map<string, PlanningWeekRoutineExercise[]> {
  const sorted = [...prevExercises].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );
  const map = new Map<string, PlanningWeekRoutineExercise[]>();
  for (const ex of sorted) {
    const key = makeExerciseKey(ex.exercise_id ?? null, ex.name, ex.is_warmup ?? false);
    if (!key) continue;
    const arr = map.get(key) ?? [];
    arr.push(ex);
    map.set(key, arr);
  }
  return map;
}

/**
 * Mezcla los valores de un set ejecutado sobre un EditableSet planificado.
 *
 * Reglas (1:1 con `mergeExecutedIntoPlannedSet` de mobile):
 * - Solo sobreescribe las variables que tienen valor en el log (no nulo).
 * - El campo `weight` del log se mapea a `weight_kg` (diferencia web vs mobile).
 * - Variables custom: merge preservando las que ya están en el plan.
 * - Colapso de rangos: EditableSet no tiene campos `*_max`, por lo que no hay
 *   acción adicional (el colapso ocurre implícitamente por el tipo).
 */
function mergeExecutedIntoEditableSet(
  planned: EditableSet,
  executed: ExecutedSetEntry,
): EditableSet {
  const merged: EditableSet = { ...planned };

  // Canónicas numéricas: el log usa numbers; EditableSet usa strings.
  // Nota: `weight` del log → `weight_kg` del EditableSet (diferencia clave).
  if (executed.reps != null) merged.reps = String(executed.reps);
  if (executed.weight != null) merged.weight_kg = String(executed.weight);
  if (executed.rir != null) merged.rir = String(executed.rir);
  if (executed.seconds != null) merged.seconds = String(executed.seconds);
  if (executed.distance_m != null) merged.distance_m = String(executed.distance_m);
  if (executed.calories != null) merged.calories = String(executed.calories);
  if (executed.bricks != null) merged.bricks = String(executed.bricks);
  if (executed.rpe != null) merged.rpe = String(executed.rpe);

  // Variables custom: merge preservando las ya presentes en el plan
  if (executed.custom && Object.keys(executed.custom).length > 0) {
    const mergedCustom: Record<string, string> = { ...(planned._customVars ?? {}) };
    for (const [k, v] of Object.entries(executed.custom)) {
      mergedCustom[k] = String(v);
    }
    merged._customVars = mergedCustom;
  } else if (planned._customVars) {
    merged._customVars = { ...planned._customVars };
  }

  return merged;
}
