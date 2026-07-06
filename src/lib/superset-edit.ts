/**
 * superset-edit.ts — Helpers de mutación de grupos de superset para el editor web.
 *
 * TWIN FILE (semántica): portado conceptualmente desde `mobile/lib/superset.ts`
 * (funciones `combineIntoGroup`, `ungroup`, `reorderToContiguous`) y de la lógica
 * de remap en el backend (`backend/src/utils/superset-group-remap.js`).
 * Mantener la semántica sincronizada con esas fuentes.
 *
 * Modelo vigente: cada ejercicio es una fila independiente (`ExerciseBlockData`)
 * con un campo `superset_group: string | null`. Los miembros de un grupo comparten
 * el mismo UUID v4 y deben quedar CONTIGUOS por `order_index`.
 *
 * Reglas de inmutabilidad: ninguna función muta el array de entrada; siempre se
 * devuelve una nueva copia. No importar React ni hacer side effects.
 *
 * @module lib/superset-edit
 */

import type { ExerciseBlockData } from "@/components/routines/ExerciseBlock";

// ─── combineIntoGroup ──────────────────────────────────────────────────────────

/**
 * Combina los bloques cuyos `_key` estén en `selectedKeys` en un único grupo de
 * superset, y los reordena para que queden contiguos en el array resultante
 * (insertados en la posición del primer seleccionado, preservando el orden
 * relativo original entre sí y entre los no seleccionados).
 *
 * Semántica:
 * - Se asigna un UUID v4 nuevo (`crypto.randomUUID()`) a todos los seleccionados.
 * - Si un seleccionado pertenecía a un grupo anterior distinto, se lo saca de ese
 *   grupo. Si el grupo anterior queda con < 2 miembros tras el movimiento,
 *   se disuelve (todos sus miembros restantes quedan con `superset_group = null`).
 * - Si `selectedKeys.length < 2`, los grupos tocados se disuelven por completo
 *   (`superset_group = null` en todos sus miembros).
 * - El `order_index` de los bloques resultantes se reasigna secuencialmente (0, 1,
 *   2, …) para mantener coherencia después del reordenamiento.
 *
 * @param blocks       Array de bloques editable. No se muta.
 * @param selectedKeys Set (o array) de `_key` de los bloques a combinar.
 * @returns Nueva copia del array con los cambios aplicados.
 */
export function combineIntoGroup(
  blocks: ExerciseBlockData[],
  selectedKeys: string[] | Set<string>,
): ExerciseBlockData[] {
  const keySet = new Set(selectedKeys);

  // Encontrar los grupos viejos de los seleccionados
  const oldGroupIds = new Set<string>();
  for (const b of blocks) {
    if (keySet.has(b._key) && b.superset_group != null) {
      oldGroupIds.add(b.superset_group);
    }
  }

  // Si < 2 seleccionados → disolver todos los grupos tocados
  if (keySet.size < 2) {
    const dissolved = blocks.map((b) => {
      if (keySet.has(b._key)) return { ...b, superset_group: null };
      if (b.superset_group != null && oldGroupIds.has(b.superset_group)) {
        return { ...b, superset_group: null };
      }
      return b;
    });
    return reassignOrderIndex(dissolved);
  }

  const newGroupId: string = crypto.randomUUID();

  // Para cada grupo viejo, calcular cuántos miembros sobreviven fuera de la
  // selección. Si < 2 → disolver ese grupo viejo.
  const groupsToDissolve = new Set<string>();
  for (const gid of oldGroupIds) {
    const survivors = blocks.filter(
      (b) => b.superset_group === gid && !keySet.has(b._key),
    ).length;
    if (survivors < 2) groupsToDissolve.add(gid);
  }

  // Primero asignar el nuevo grupo (y disolver los viejos que lo necesiten)
  const withNewGroup = blocks.map((b) => {
    if (keySet.has(b._key)) {
      return { ...b, superset_group: newGroupId };
    }
    if (b.superset_group != null && groupsToDissolve.has(b.superset_group)) {
      return { ...b, superset_group: null };
    }
    return b;
  });

  // Reordenar para que los seleccionados queden contiguos a partir del índice del
  // primer seleccionado (en posición original del array, NO por order_index).
  const firstSelectedPos = withNewGroup.findIndex((b) => keySet.has(b._key));
  const reordered = reorderToContiguous(
    withNewGroup,
    withNewGroup
      .map((b, i) => (keySet.has(b._key) ? i : -1))
      .filter((i) => i >= 0),
    firstSelectedPos,
  );

  return reassignOrderIndex(reordered);
}

// ─── ungroupSuperset ───────────────────────────────────────────────────────────

/**
 * Disuelve el grupo completo identificado por `groupId`: setea `superset_group = null`
 * en todos sus miembros. Los bloques que no pertenecen al grupo quedan intactos.
 * El `order_index` NO se reasigna (los bloques mantienen su posición relativa).
 *
 * @param blocks  Array de bloques editable. No se muta.
 * @param groupId UUID del grupo a disolver.
 * @returns Nueva copia del array con los miembros del grupo desagrupados.
 */
export function ungroupSuperset(
  blocks: ExerciseBlockData[],
  groupId: string,
): ExerciseBlockData[] {
  return blocks.map((b) =>
    b.superset_group === groupId ? { ...b, superset_group: null } : b,
  );
}

// ─── removeFromSupersetGroup ──────────────────────────────────────────────────

/**
 * Saca UN ejercicio (por `_key`) de su grupo de superset. Si tras quitarlo el
 * grupo queda con un solo miembro, ese miembro también se desagrupa (un grupo
 * de 1 no es válido) → la combinación se disuelve por completo.
 *
 * TWIN FILE: mobile/lib/superset.ts #removeFromGroup
 *
 * @param blocks Array de bloques. No se muta.
 * @param key    `_key` del bloque a sacar del grupo.
 * @returns Nueva copia del array con el bloque (y, si corresponde, el grupo) desagrupado.
 */
export function removeFromSupersetGroup(
  blocks: ExerciseBlockData[],
  key: string,
): ExerciseBlockData[] {
  const target = blocks.find((b) => b._key === key);
  const groupId = target?.superset_group;
  if (!groupId) return blocks.map((b) => ({ ...b }));

  // Miembros que quedarían en el grupo tras sacar el target.
  const remaining = blocks.filter(
    (b) => b.superset_group === groupId && b._key !== key,
  );

  // Si queda <2, disolver todo el grupo; si no, solo sacar el target.
  const dissolve = remaining.length < 2;

  return blocks.map((b) => {
    if (b._key === key) return { ...b, superset_group: null };
    if (dissolve && b.superset_group === groupId)
      return { ...b, superset_group: null };
    return { ...b };
  });
}

// ─── remapSupersetGroups ───────────────────────────────────────────────────────

/**
 * Regenera los UUIDs de todos los grupos presentes en el array: cada UUID viejo
 * se sustituye por uno nuevo, preservando el agrupamiento (dos bloques que
 * compartían el mismo UUID viejo comparten el mismo UUID nuevo).
 *
 * Bloques con `superset_group = null` quedan `null`.
 *
 * Uso principal: al copiar/pegar una semana (día) evitar que ejercicios de
 * semanas distintas compartan el mismo `superset_group`.
 *
 * TWIN FILE: backend/src/utils/superset-group-remap.js #remapSupersetGroups
 *
 * @param blocks Array de bloques. No se muta.
 * @returns Nueva copia con todos los UUIDs de grupo regenerados.
 */
export function remapSupersetGroups(
  blocks: ExerciseBlockData[],
): ExerciseBlockData[] {
  const remap = new Map<string, string>();

  return blocks.map((b) => {
    if (b.superset_group == null) return { ...b };
    let newId = remap.get(b.superset_group);
    if (!newId) {
      newId = crypto.randomUUID();
      remap.set(b.superset_group, newId);
    }
    return { ...b, superset_group: newId };
  });
}

// ─── remapSupersetGroupsRaw ────────────────────────────────────────────────────

/**
 * Variante de `remapSupersetGroups` que opera sobre cualquier array de objetos
 * con un campo `superset_group: string | null | undefined` (sin necesitar
 * `ExerciseBlockData`). Útil para remapar ejercicios del tipo
 * `PlanningWeekRoutineExercise` antes de copiarlos al clipboard.
 *
 * Semántica idéntica a `remapSupersetGroups`: cada UUID viejo → uno nuevo,
 * preservando el agrupamiento. Objetos con `superset_group` null/undefined
 * quedan null.
 *
 * @param items Array de objetos con `superset_group`. No se muta.
 * @returns Nueva copia del array con los UUIDs de grupo regenerados.
 */
export function remapSupersetGroupsRaw<T extends { superset_group?: string | null }>(
  items: T[],
): T[] {
  const remap = new Map<string, string>();

  return items.map((item) => {
    const sg = item.superset_group ?? null;
    if (sg == null) return { ...item, superset_group: null };
    let newId = remap.get(sg);
    if (!newId) {
      newId = crypto.randomUUID();
      remap.set(sg, newId);
    }
    return { ...item, superset_group: newId };
  });
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Reordena los elementos en `indices` para que queden contiguos a partir de
 * `insertAt`, preservando el orden relativo de los seleccionados y de los no
 * seleccionados.
 *
 * Ejemplo: indices=[0,2], insertAt=0, array=[A,B,C,D] → [A,C,B,D]
 *
 * @param items     Array original. No se muta.
 * @param indices   Índices (0-based) de los elementos a agrupar.
 * @param insertAt  Posición de inserción (índice del primero seleccionado).
 * @returns Nueva copia del array reordenado.
 */
function reorderToContiguous<T>(
  items: T[],
  indices: number[],
  insertAt: number,
): T[] {
  if (indices.length <= 1) return [...items];

  const selectedSet = new Set(indices);
  // Ordenar por posición de aparición para preservar orden relativo
  const sortedIndices = [...indices].sort((a, b) => a - b);

  const selected = sortedIndices.map((i) => items[i]!);
  const others = items.filter((_, i) => !selectedSet.has(i));

  // `insertAt` refiere al índice en el array original; en `others` los primeros
  // `insertAt - (cantidad de seleccionados antes de insertAt)` elementos van antes.
  const selectedBeforeInsert = sortedIndices.filter((i) => i < insertAt).length;
  const splitPoint = insertAt - selectedBeforeInsert;

  return [
    ...others.slice(0, splitPoint),
    ...selected,
    ...others.slice(splitPoint),
  ];
}

/**
 * Reasigna `order_index` secuencialmente (0, 1, 2, …) a todos los bloques.
 * No reordena — solo actualiza el campo numérico para que refleje la posición en
 * el array.
 */
function reassignOrderIndex(blocks: ExerciseBlockData[]): ExerciseBlockData[] {
  return blocks.map((b, i) => (b.order_index === i ? b : { ...b, order_index: i }));
}
