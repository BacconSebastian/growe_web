"use client";

/**
 * WeekRoutineExercisesEditor.tsx
 *
 * Editor del snapshot de ejercicios de un PlanningWeekRoutine.
 * Renderiza ejercicios sueltos y supersets agrupados con buildRounds.
 * Reutiliza ExerciseBlock + SetsTable del editor de rutinas.
 *
 * Uso: embebido dentro de PlanningWeekDetail como panel colapsable por rutina.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Save, Trash2, History, CalendarClock } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ExerciseBlock,
  ExerciseBlockData,
  routineExerciseToBlock,
} from "@/components/routines/ExerciseBlock";
import { SupersetGroupSection } from "@/components/routines/SupersetGroupSection";
import { editableToRoutineSet } from "@/components/routines/SetsTable";
import { resolveVariablesConfig } from "@/lib/exercise-presets";
import { groupBySupersetGroup } from "@/lib/superset-grouping";
import { getErrorMessage } from "@/lib/utils";
import {
  fillFromLastLog,
  fillFromPreviousWeek,
  type RoutineSnapshotForFill,
} from "@/lib/exercise-value-fill";
import { combineIntoGroup, ungroupSuperset, removeFromSupersetGroup } from "@/lib/superset-edit";
import { getLastStudentRoutineLog } from "@/lib/api/coaching";

import type {
  PlanningWeekRoutineExercise,
  RoutineExercise,
  PlanningWeekRoutine,
} from "@/lib/api/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeekRoutineExercisesEditorProps {
  weekRoutine: PlanningWeekRoutine;
  /** Si true, los controles de edición quedan deshabilitados (authorship constraint) */
  readOnly?: boolean;
  /** Callback al guardar el snapshot (nombre + ejercicios) */
  onSave: (
    wkRtId: number,
    title: string,
    exercises: Array<Record<string, unknown>>
  ) => Promise<void>;
  /** Callback al eliminar la rutina de la semana */
  onDelete: (wkRtId: number) => Promise<void>;
  /** Para mostrar estado de carga inicial si los ejercicios no están cargados aún */
  loading?: boolean;
  /**
   * Modo de la vista: "own" (alumno viendo su planning) o "coach" (coach editando).
   * Necesario para habilitar/deshabilitar el botón "Últimos valores".
   */
  mode?: "own" | "coach";
  /**
   * ID del alumno. Requerido en modo coach para llamar a getLastStudentRoutineLog.
   */
  studentId?: number;
  /**
   * Ejercicios del snapshot equivalente de la semana anterior (N-1).
   * Cuando está presente, habilita el botón "Semana pasada".
   * Derivado por PlanningWeekDetail a partir del prop previousWeek.
   */
  prevExercises?: PlanningWeekRoutineExercise[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convierte PlanningWeekRoutineExercise a RoutineExercise (shape compatible con ExerciseBlock) */
function weekRoutineExToRoutineExercise(
  ex: PlanningWeekRoutineExercise
): RoutineExercise {
  return {
    id: ex.id,
    routine_id: 0,
    exercise_id: ex.exercise_id ?? null,
    name: ex.name,
    series: ex.series,
    repetitions: ex.repetitions,
    weight_kg: ex.weight_kg,
    rir: ex.rir,
    order_index: ex.order_index,
    variant_order: ex.variant_order,
    sets_data: ex.sets_data,
    exercise_type: ex.exercise_type,
    is_warmup: ex.is_warmup,
    variables_config: ex.variables_config,
    description: undefined,
    exercise: ex.exercise,
  };
}

/**
 * Construye el payload de ejercicios que espera el backend al guardar el snapshot.
 *
 * Lee `superset_group` directamente del bloque (no de originalExercises) para que
 * los cambios de agrupamiento hechos en memoria (combineIntoGroup/ungroupSuperset)
 * se persistan correctamente.
 *
 * Normaliza contigüidad antes de mapear: los miembros de un grupo se agrupan juntos
 * en el payload, lo que garantiza que el backend reciba grupos contiguos incluso si
 * el usuario reordenó un bloque individual sin mover el grupo completo.
 *
 * El parámetro `originalExercises` ya no se utiliza para superset_group pero se
 * mantiene en la firma para compatibilidad con los call-sites existentes.
 */
function buildExercisesPayload(
  blocks: ExerciseBlockData[],
  _originalExercises: PlanningWeekRoutineExercise[]
): Array<Record<string, unknown>> {
  // Normalizar contigüidad: reordenar bloques para que los miembros de cada grupo
  // queden contiguos (misma posición relativa entre sí, insertados en la posición
  // del primer miembro del grupo).
  const orderedBlocks = normalizeGroupContiguity(blocks);

  return orderedBlocks.map((block, idx) => {
    const config = resolveVariablesConfig(
      block.variables_config,
      block.exercise_type
    );
    const sets = block.sets.map((s) => editableToRoutineSet(s, config));

    return {
      exercise_id: block.exercise_id,
      name: block.name,
      order_index: idx + 1,
      series: block.sets.length,
      repetitions:
        (block.sets[0] as Record<string, unknown>)?.reps != null
          ? Number((block.sets[0] as Record<string, unknown>).reps)
          : 0,
      exercise_type: block.exercise_type,
      is_warmup: block.is_warmup,
      sets_data: sets,
      variables_config: block.variables_config,
      superset_group: block.superset_group ?? null,
    } as Record<string, unknown>;
  });
}

/**
 * Garantiza que los bloques de un mismo superset_group queden contiguos en el array.
 * Algoritmo: primera pasada lineal; cuando se encuentra el primer miembro de un grupo
 * no procesado, se insertan todos los miembros de ese grupo en ese punto.
 * Los bloques sin grupo y los grupos ya contiguos no se mueven.
 */
function normalizeGroupContiguity(blocks: ExerciseBlockData[]): ExerciseBlockData[] {
  const emitted = new Set<string>(); // _keys ya emitidos
  const groupEmitted = new Set<string>(); // groupIds ya emitidos
  const result: ExerciseBlockData[] = [];

  for (const block of blocks) {
    if (emitted.has(block._key)) continue;

    if (block.superset_group && !groupEmitted.has(block.superset_group)) {
      // Emitir todos los miembros de este grupo en orden de aparición original
      groupEmitted.add(block.superset_group);
      const members = blocks.filter((b) => b.superset_group === block.superset_group);
      for (const m of members) {
        result.push(m);
        emitted.add(m._key);
      }
    } else if (!block.superset_group) {
      result.push(block);
      emitted.add(block._key);
    }
    // Si block.superset_group está seteado pero groupEmitted ya lo tiene → ya fue incluido
  }

  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const WeekRoutineExercisesEditor: React.FC<
  WeekRoutineExercisesEditorProps
> = ({
  weekRoutine,
  readOnly = false,
  onSave,
  onDelete,
  loading = false,
  mode = "own",
  studentId,
  prevExercises,
}) => {
  const [blocks, setBlocks] = useState<ExerciseBlockData[]>([]);
  const [title, setTitle] = useState(weekRoutine.routine_title);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  /** Estado de carga del fill (ambos botones comparten) */
  const [fillLoading, setFillLoading] = useState(false);
  const [fillError, setFillError] = useState<string | null>(null);
  /** Modo "seleccionar para combinar" — bloquea el resto del editor */
  const [combineMode, setCombineMode] = useState(false);
  /** _keys de los bloques seleccionados para combinar */
  const [combineSelectedKeys, setCombineSelectedKeys] = useState<Set<string>>(new Set());

  // Sincronizar el nombre cuando cambia la rutina
  useEffect(() => {
    setTitle(weekRoutine.routine_title);
  }, [weekRoutine.id, weekRoutine.routine_title]);

  // Inicializar bloques cuando cambian los ejercicios
  useEffect(() => {
    const sorted = [...weekRoutine.exercises].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
    setBlocks(
      sorted.map((ex) => {
        const re = weekRoutineExToRoutineExercise(ex);
        const block = routineExerciseToBlock(re);
        // Usamos el id del ejercicio como _key para conservar el superset_group lookup
        return { ...block, _key: String(ex.id) };
      })
    );
    setSavedSuccess(false);
    setSaveError(null);
  }, [weekRoutine.id, weekRoutine.exercises]);

  const handleUpdate = useCallback(
    (key: string, updated: Partial<ExerciseBlockData>) => {
      setBlocks((prev) =>
        prev.map((b) => (b._key === key ? { ...b, ...updated } : b))
      );
    },
    []
  );

  const handleRemove = useCallback((key: string) => {
    setBlocks((prev) => prev.filter((b) => b._key !== key));
  }, []);

  /**
   * En este editor, cada bloque es un "grupo" de una sola variante.
   * onReorderGroup recibe (currentOrderIndex, newGroupPosition 1-based).
   * Aquí el order_index coincide con la posición en el array de blocks.
   */
  const handleReorderGroup = useCallback(
    (currentOrderIndex: number, newGroupPosition: number) => {
      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b.order_index === currentOrderIndex);
        const target = Math.min(
          Math.max(newGroupPosition - 1, 0),
          prev.length - 1
        );
        if (idx < 0 || target === idx) return prev;
        const next = [...prev];
        const [moved] = next.splice(idx, 1);
        next.splice(target, 0, moved);
        // Re-asignar order_index
        return next.map((b, i) => ({ ...b, order_index: i }));
      });
    },
    []
  );

  // En este editor no se soportan añadir variantes (el snapshot es fijo)
  const handleAddVariant = useCallback((_orderIndex: number) => {
    // no-op en el editor de snapshots de planning
  }, []);

  // ─── Combine handlers ────────────────────────────────────────────────────────

  /**
   * Entra al modo combinar con el bloque del `_key` dado preseleccionado.
   * Disparado por el botón Link2 de un ExerciseBlock expandido.
   */
  const handleStartCombine = useCallback((key: string) => {
    if (readOnly) return;
    setCombineMode(true);
    setCombineSelectedKeys(new Set([key]));
  }, [readOnly]);

  /**
   * Toggle de selección de un bloque en el modo combinar.
   */
  const handleToggleCombineSelect = useCallback((key: string) => {
    setCombineSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  /**
   * Confirma el combine: aplica combineIntoGroup y sale del modo combinar.
   * Requiere ≥2 seleccionados (validación en el botón y acá como guard).
   */
  const handleConfirmCombine = useCallback(() => {
    if (combineSelectedKeys.size < 2) return;
    setBlocks((prev) => combineIntoGroup(prev, combineSelectedKeys));
    setCombineMode(false);
    setCombineSelectedKeys(new Set());
  }, [combineSelectedKeys]);

  /**
   * Cancela el modo combinar sin aplicar cambios.
   */
  const handleCancelCombine = useCallback(() => {
    setCombineMode(false);
    setCombineSelectedKeys(new Set());
  }, []);

  /**
   * Deshace un grupo superset: aplica ungroupSuperset y actualiza los bloques.
   */
  const handleUngroupSuperset = useCallback((groupId: string) => {
    setBlocks((prev) => ungroupSuperset(prev, groupId));
  }, []);

  /**
   * Saca un ejercicio de su grupo de superset. Si el grupo queda con <2 miembros,
   * la combinación se disuelve por completo.
   */
  const handleRemoveFromGroup = useCallback((key: string) => {
    setBlocks((prev) => removeFromSupersetGroup(prev, key));
  }, []);

  /**
   * Botón "Últimos valores" — coach only.
   * Llama a getLastStudentRoutineLog y aplica fillFromLastLog sobre los bloques.
   * No auto-guarda: el usuario debe presionar "Guardar" manualmente.
   */
  const handleFillFromLastLog = async () => {
    if (mode !== "coach" || studentId == null || !weekRoutine.routine_id) return;
    setFillLoading(true);
    setFillError(null);
    try {
      const result = await getLastStudentRoutineLog(studentId, weekRoutine.routine_id);
      const lastLog = result?.items?.[0];
      if (!lastLog) {
        setFillError("No hay entrenamientos anteriores para esta rutina.");
        return;
      }
      const snapshot = lastLog.routine_snapshot as RoutineSnapshotForFill | null | undefined;
      if (!snapshot) {
        setFillError("El último entrenamiento no tiene datos de ejercicios.");
        return;
      }
      setBlocks((prev) => fillFromLastLog(prev, snapshot));
    } catch (err) {
      setFillError(getErrorMessage(err, "No se pudieron cargar los últimos valores."));
    } finally {
      setFillLoading(false);
    }
  };

  /**
   * Botón "Semana pasada" — ambos modos.
   * Aplica fillFromPreviousWeek en memoria usando los ejercicios de la semana N-1.
   * No requiere API — los datos vienen del prop prevExercises.
   * No auto-guarda: el usuario debe presionar "Guardar" manualmente.
   */
  const handleFillFromPreviousWeek = () => {
    if (!prevExercises || prevExercises.length === 0) return;
    setFillError(null);
    setBlocks((prev) => fillFromPreviousWeek(prev, prevExercises));
  };

  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true);
    setSaveError(null);
    setSavedSuccess(false);
    try {
      const payload = buildExercisesPayload(blocks, weekRoutine.exercises);
      await onSave(weekRoutine.id, title.trim() || weekRoutine.routine_title, payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setSaveError(null);
    try {
      await onDelete(weekRoutine.id);
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo eliminar la rutina."));
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ─── Agrupamiento de supersets (desde blocks en estado, no weekRoutine.exercises) ─

  // Derivar el mapa de superset_group directamente desde el estado `blocks`
  // para que refleje los cambios de combineIntoGroup/ungroupSuperset en memoria.
  const blocksSupersetGroup = new Map<string, string>();
  for (const block of blocks) {
    if (block.superset_group) {
      blocksSupersetGroup.set(block._key, block.superset_group);
    }
  }

  // Suprimir warnings de groupBySupersetGroup (ya no se usa; se reemplazó por el mapa directo)
  void groupBySupersetGroup;

  const renderedGroupIds = new Set<string>();
  const renderOrder: Array<
    | { type: "block"; block: ExerciseBlockData; index: number }
    | { type: "superset"; groupId: string; memberBlocks: ExerciseBlockData[] }
  > = [];

  let globalBlockIndex = 0;
  for (const block of blocks) {
    const sg = blocksSupersetGroup.get(block._key);
    if (sg) {
      if (!renderedGroupIds.has(sg)) {
        renderedGroupIds.add(sg);
        const memberBlocks = blocks.filter(
          (b) => blocksSupersetGroup.get(b._key) === sg
        );
        renderOrder.push({ type: "superset", groupId: sg, memberBlocks });
      }
    } else {
      renderOrder.push({ type: "block", block, index: globalBlockIndex });
    }
    globalBlockIndex++;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-sm py-md">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonLine key={i} height={48} />
        ))}
      </div>
    );
  }

  let displayIndex = 0;
  // Total de grupos visuales (para el OrderBadge)
  const totalVisualGroups = renderOrder.length;

  return (
    <div className="flex flex-col gap-md">
      {/* ── Barra superior: nombre + fill buttons + Eliminar + Guardar ── */}
      {!combineMode && (
        <div className="flex items-center gap-md flex-wrap">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={readOnly}
            placeholder="Nombre de la rutina..."
            className="flex-1 min-w-[200px] h-11 rounded-pill px-lg bg-fill-tertiary text-fg placeholder-fg-tertiary text-base font-semibold border border-transparent outline-none transition-colors focus:border-primary disabled:cursor-default"
          />

          {/* Botón "Últimos valores" — solo aplica en modo coach con routine_id.
              En "editar rutina" (own) se muestra pero disabled. */}
          {(() => {
            const canFillLastLog =
              mode === "coach" && studentId != null && !!weekRoutine.routine_id && !readOnly;
            return (
              <Tooltip
                label={
                  canFillLastLog
                    ? "Pegar los valores del último entrenamiento del alumno"
                    : "Disponible al editar la planificación de un alumno"
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  loading={fillLoading}
                  disabled={!canFillLastLog || fillLoading || saving}
                  onClick={handleFillFromLastLog}
                  iconLeft={<History size={16} />}
                >
                  Últimos valores
                </Button>
              </Tooltip>
            );
          })()}

          {/* Botón "Semana pasada" — ambos modos; disabled si no hay semana previa. */}
          {(() => {
            const canFillPrevWeek = !!prevExercises && prevExercises.length > 0 && !readOnly;
            return (
              <Tooltip
                label={
                  canFillPrevWeek
                    ? "Pegar los valores planificados en la semana anterior"
                    : "No hay una semana anterior con esta rutina"
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  disabled={!canFillPrevWeek || fillLoading || saving}
                  onClick={handleFillFromPreviousWeek}
                  iconLeft={<CalendarClock size={16} />}
                >
                  Semana pasada
                </Button>
              </Tooltip>
            );
          })()}

          {!readOnly && (
            <>
              <Button
                type="button"
                variant="danger"
                size="md"
                loading={deleting}
                onClick={() => setShowDeleteConfirm(true)}
                iconLeft={<Trash2 size={16} />}
              >
                Eliminar
              </Button>
              <Button
                type="button"
                variant={savedSuccess ? "success" : "primary"}
                size="md"
                loading={saving}
                onClick={handleSave}
                iconLeft={<Save size={16} />}
              >
                {savedSuccess ? "Guardado" : "Guardar"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Barra de acción del modo combinar ──
          Misma altura que la barra normal (h-11, sin padding vertical) para que
          la pantalla no se mueva al entrar/salir del modo. El recuadro ámbar se
          dibuja con `outline` (no ocupa espacio en el layout). */}
      {combineMode && (
        <div className="flex items-center gap-md min-h-11">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleCancelCombine}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={combineSelectedKeys.size < 2}
            onClick={handleConfirmCombine}
            className="flex-1"
          >
            Combinar ({combineSelectedKeys.size})
          </Button>
        </div>
      )}

      {!combineMode && saveError && <ErrorBanner message={saveError} dismissible />}
      {!combineMode && fillError && <ErrorBanner message={fillError} dismissible />}

      {blocks.length === 0 && !combineMode && (
        <p className="text-sm text-fg-tertiary py-md text-center">
          Esta rutina no tiene ejercicios en el snapshot.
        </p>
      )}

      {/* Lista de ejercicios */}
      <div className="flex flex-col gap-sm">
        {renderOrder.map((item) => {
          if (item.type === "superset") {
            const groupStartIndex = displayIndex;
            displayIndex += item.memberBlocks.length;
            return (
              <SupersetGroupSection
                key={`sg-${item.groupId}`}
                memberCount={item.memberBlocks.length}
                combineMode={combineMode}
                readOnly={readOnly}
                onUngroup={!readOnly ? () => handleUngroupSuperset(item.groupId) : undefined}
              >
                {item.memberBlocks.map((block, memberIdx) => {
                  const gIdx = groupStartIndex + memberIdx;
                  return (
                    <ExerciseBlock
                      key={block._key}
                      variants={[block]}
                      groupIndex={gIdx}
                      totalGroups={totalVisualGroups}
                      readOnly={readOnly || combineMode}
                      defaultExpanded={false}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                      onReorderGroup={handleReorderGroup}
                      onAddVariant={handleAddVariant}
                      onRemoveFromGroup={
                        !readOnly ? () => handleRemoveFromGroup(block._key) : undefined
                      }
                      combineMode={combineMode}
                      combineSelected={combineSelectedKeys.has(block._key)}
                      onToggleCombineSelect={() => handleToggleCombineSelect(block._key)}
                    />
                  );
                })}
              </SupersetGroupSection>
            );
          } else {
            const idx = displayIndex++;
            return (
              <ExerciseBlock
                key={item.block._key}
                variants={[item.block]}
                groupIndex={idx}
                totalGroups={totalVisualGroups}
                readOnly={readOnly || combineMode}
                defaultExpanded={false}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onReorderGroup={handleReorderGroup}
                onAddVariant={handleAddVariant}
                onStartCombine={!readOnly ? () => handleStartCombine(item.block._key) : undefined}
                combineMode={combineMode}
                combineSelected={combineSelectedKeys.has(item.block._key)}
                onToggleCombineSelect={() => handleToggleCombineSelect(item.block._key)}
              />
            );
          }
        })}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Eliminar rutina"
        description={`¿Quitar "${weekRoutine.routine_title}" de esta semana? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
