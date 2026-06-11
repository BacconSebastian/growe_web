/**
 * superset-grouping.ts — Helpers para el intercalado de ejercicios en supersets.
 *
 * Nuevo modelo (post-refactor Fase 1): los ejercicios son filas independientes
 * agrupadas por superset_group (UUID v4). Al mostrarlos, sus series se intercalan
 * en rondas: ronda 1 → set[0] de cada miembro, ronda 2 → set[1], etc.
 *
 * TWIN FILE: replicar 1:1 desde `mobile/lib/superset-grouping.ts`
 * (que a su vez replica 1:1 `backend/src/utils/superset-grouping.js`).
 * Mantener firmas, algoritmo y nombres de campos sincronizados.
 *
 * @module lib/superset-grouping
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Un ítem de set dentro de una ronda de intercalado.
 * Corresponde a una serie de un ejercicio del grupo en la posición de la ronda.
 */
export interface ExerciseSetItem {
  /** ID del ejercicio (PlanningWeekRoutineExercise.id en modo planning, o RoutineExercise.id en modo rutina suelta). */
  exerciseId: number;
  /** Índice 0-based dentro del sets_data del ejercicio. */
  setIndex: number;
  /** Objeto del set individual (del array sets_data). */
  set: Record<string, unknown>;
}

/**
 * Una ronda de intercalado.
 * Contiene los sets de cada ejercicio del grupo que participan en esa posición.
 */
export interface Round {
  /** Número de ronda (0-based). */
  round: number;
  /** Sets de esta ronda, en el orden de los ejercicios. */
  items: ExerciseSetItem[];
}

/**
 * Resultado de groupBySupersetGroup.
 */
export interface GroupByResult<T> {
  /** Mapa de superset_group UUID → array ordenado de ejercicios del grupo. */
  groups: Map<string, T[]>;
  /** Ejercicios con superset_group null/undefined (en su orden original). */
  standalone: T[];
  /** Los UUIDs de grupo en el orden de primera aparición. */
  orderedGroupIds: string[];
}

// ─── buildRounds ──────────────────────────────────────────────────────────────

/**
 * Construye las rondas de intercalado para un grupo de ejercicios de superset.
 *
 * Algoritmo (1:1 con backend):
 *   maxSets = max(exercises[i].sets_data.length)
 *   for r in 0..maxSets-1:
 *     items = []
 *     for ex in exercises (en orden):
 *       if ex.sets_data[r] existe: push { exerciseId, setIndex: r, set }
 *     if items.length > 0: rounds.push({ round: r, items })
 *
 * Rondas finales con menos miembros que la ronda 1 son válidas (series desiguales
 * permitidas). No se generan placeholders para series faltantes.
 *
 * Precondición: `groupExercises` ya está ordenado por order_index (el caller
 * debe ordenarlos antes). Esta función no reordena.
 *
 * TWIN FILE: backend/src/utils/superset-grouping.js #buildRounds
 *
 * @param groupExercises Ejercicios del grupo ordenados por order_index, cada uno con su sets_data.
 * @returns Array de rondas. Vacío si groupExercises está vacío.
 */
export function buildRounds(
  groupExercises: Array<{ id: number; sets_data: Record<string, unknown>[] }>,
): Round[] {
  if (!Array.isArray(groupExercises) || groupExercises.length === 0) return [];

  // Calcular el máximo de sets entre todos los ejercicios del grupo
  const maxSets = groupExercises.reduce((max, ex) => {
    const len = Array.isArray(ex.sets_data) ? ex.sets_data.length : 0;
    return len > max ? len : max;
  }, 0);

  if (maxSets === 0) return [];

  const rounds: Round[] = [];

  for (let r = 0; r < maxSets; r++) {
    const items: ExerciseSetItem[] = [];

    for (const ex of groupExercises) {
      const setsData = Array.isArray(ex.sets_data) ? ex.sets_data : [];
      if (r < setsData.length) {
        items.push({
          exerciseId: ex.id,
          setIndex: r,
          set: setsData[r],
        });
      }
      // Sin placeholder: si el ejercicio no tiene set en esta ronda, se omite.
    }

    // Solo incluir la ronda si tiene al menos 1 item
    if (items.length > 0) {
      rounds.push({ round: r, items });
    }
  }

  return rounds;
}

// ─── groupBySupersetGroup ─────────────────────────────────────────────────────

/**
 * Agrupa un array de ejercicios (de una rutina o snapshot) por superset_group.
 *
 * Devuelve:
 *   - `groups`: mapa superset_group UUID → array ordenado de ejercicios del grupo.
 *   - `standalone`: ejercicios con superset_group null/undefined (en su orden original).
 *   - `orderedGroupIds`: los UUIDs de grupo en el orden de primera aparición.
 *
 * Los ejercicios dentro de cada grupo se ordenan por order_index (ASC), con id
 * como tiebreaker. El orden de `standalone` se preserva del input.
 *
 * Uso típico: para construir la UI de una rutina/semana que mezcla ejercicios
 * sueltos y supersets en el orden visual correcto.
 *
 * TWIN FILE: backend/src/utils/superset-grouping.js #groupBySupersetGroup
 *
 * @param exercises Ejercicios de una rutina o snapshot.
 * @returns GroupByResult con grupos, standalone y orderedGroupIds.
 */
export function groupBySupersetGroup<
  T extends {
    superset_group?: string | null;
    order_index?: number;
    id: number;
  },
>(exercises: T[]): GroupByResult<T> {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return { groups: new Map(), standalone: [], orderedGroupIds: [] };
  }

  const groups = new Map<string, T[]>();     // UUID → T[]
  const orderedGroupIds: string[] = [];       // UUIDs en orden de primera aparición
  const standalone: T[] = [];                 // ejercicios sin grupo

  for (const ex of exercises) {
    const sg = ex.superset_group ?? null;

    if (sg === null || sg === undefined) {
      standalone.push(ex);
    } else {
      if (!groups.has(sg)) {
        groups.set(sg, []);
        orderedGroupIds.push(sg);
      }
      groups.get(sg)!.push(ex);
    }
  }

  // Ordenar cada grupo por order_index, tiebreaker id
  for (const [, members] of groups) {
    members.sort((a, b) => {
      const aIdx = a.order_index ?? 0;
      const bIdx = b.order_index ?? 0;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return (a.id ?? 0) - (b.id ?? 0);
    });
  }

  return { groups, standalone, orderedGroupIds };
}
