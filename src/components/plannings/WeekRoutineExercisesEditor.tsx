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
  groupVariants,
} from "@/components/routines/ExerciseBlock";
import { SupersetGroupSection } from "@/components/routines/SupersetGroupSection";
import { editableToRoutineSet } from "@/components/routines/SetsTable";
import { resolveVariablesConfig, getPresetVariablesConfig, buildEmptySet } from "@/lib/exercise-presets";
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
  ExerciseType,
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
 * - Agrupa bloques por order_index (grupos de variantes) y por superset_group.
 * - Asigna order_index secuencial (1-based) por grupo de variantes; las variantes
 *   del mismo grupo comparten el mismo order_index y se diferencian por variant_order.
 * - Lee superset_group directamente del bloque (no de originalExercises) para que
 *   los cambios de combineIntoGroup/ungroupSuperset hechos en memoria se persistan.
 *
 * Contrato verificado: planning.service.js _buildExerciseRows:171-172 acepta
 * order_index y variant_order directamente del payload.
 */
function buildExercisesPayload(
  blocks: ExerciseBlockData[],
  _originalExercises: PlanningWeekRoutineExercise[]
): Array<Record<string, unknown>> {
  // Agrupar bloques por order_index (cada grupo = una posición visual con sus variantes)
  // y normalizar contigüidad de supersets dentro de cada grupo de variantes.
  const variantGroups = groupVariants(normalizeGroupContiguity(blocks));

  const result: Array<Record<string, unknown>> = [];

  variantGroups.forEach((group, groupIdx) => {
    const sharedOrderIndex = groupIdx + 1; // 1-based, compartido por todas las variantes

    group.variants.forEach((block) => {
      const config = resolveVariablesConfig(
        block.variables_config,
        block.exercise_type
      );
      const sets = block.sets.map((s) => editableToRoutineSet(s, config));

      result.push({
        exercise_id: block.exercise_id,
        name: block.name,
        // Todas las variantes del grupo comparten order_index; se diferencian por variant_order.
        order_index: sharedOrderIndex,
        variant_order: block.variant_order ?? 0,
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
      } as Record<string, unknown>);
    });
  });

  return result;
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
    setBlocks((prev) => {
      const filtered = prev.filter((b) => b._key !== key);
      // Re-normalizar variant_order dentro de los grupos afectados (igual que RoutineEditor)
      const groups = groupVariants(filtered);
      const result: ExerciseBlockData[] = [];
      groups.forEach((group) => {
        group.variants.forEach((v, vIdx) => {
          result.push({ ...v, variant_order: vIdx });
        });
      });
      return result;
    });
  }, []);

  /**
   * Reordena el grupo (todas sus variantes) a la posición 1-based dada.
   * Espeja la implementación de RoutineEditor.handleReorderGroup.
   */
  const handleReorderGroup = useCallback(
    (currentOrderIndex: number, newGroupPosition: number) => {
      setBlocks((prev) => {
        const groups = groupVariants(prev);
        const currentGroupIdx = groups.findIndex((g) =>
          g.variants.some((v) => v.order_index === currentOrderIndex)
        );
        if (currentGroupIdx < 0) return prev;

        const targetIdx = Math.min(
          Math.max(newGroupPosition - 1, 0),
          groups.length - 1
        );
        if (targetIdx === currentGroupIdx) return prev;

        const reordered = [...groups];
        const [moved] = reordered.splice(currentGroupIdx, 1);
        reordered.splice(targetIdx, 0, moved);

        // Aplanar y re-asignar order_index
        const result: ExerciseBlockData[] = [];
        reordered.forEach((group, gIdx) => {
          group.variants.forEach((v) => {
            result.push({ ...v, order_index: gIdx });
          });
        });
        return result;
      });
    },
    []
  );

  // ── Builder de bloque vacío (igual que RoutineEditor.buildEmptyBlock) ─────────
  const buildEmptyBlock = useCallback(
    (orderIndex: number, variantOrder: number, keyPrefix: string): ExerciseBlockData => {
      const exerciseType: ExerciseType = "weight";
      const config = getPresetVariablesConfig(exerciseType);
      const defaultSetRaw = buildEmptySet(config);
      const defaultSet: Record<string, string> = {};
      for (const [k, v] of Object.entries(defaultSetRaw)) {
        if (typeof v === "string") defaultSet[k] = v;
      }
      return {
        _key: `${keyPrefix}-${Date.now()}-${Math.random()}`,
        routine_exercise_id: null,
        exercise_id: null,
        name: "",
        exercise_type: exerciseType,
        is_warmup: false,
        variables_config: config,
        sets: [defaultSet as ExerciseBlockData["sets"][number]],
        order_index: orderIndex,
        variant_order: variantOrder,
        superset_group: null,
      };
    },
    []
  );

  /**
   * Agrega una variante (suplente) vacía al grupo con el order_index dado.
   * Espeja la implementación de RoutineEditor.handleAddVariant.
   */
  const handleAddVariant = useCallback(
    (orderIndex: number) => {
      setBlocks((prev) => {
        const groups = groupVariants(prev);
        const group = groups.find((g) =>
          g.variants.some((v) => v.order_index === orderIndex)
        );
        const maxVariantOrder = group
          ? Math.max(...group.variants.map((v) => v.variant_order)) + 1
          : 1;
        // Heredar superset_group del grupo existente para no romper el invariante:
        // todas las variantes de un order_index deben compartir el mismo superset_group.
        const inheritedSupersetGroup = group?.variants[0]?.superset_group ?? null;
        const newBlock = buildEmptyBlock(orderIndex, maxVariantOrder, "new-variant");
        return [...prev, { ...newBlock, superset_group: inheritedSupersetGroup }];
      });
    },
    [buildEmptyBlock]
  );

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
   *
   * combineSelectedKeys guarda la primaryKey (primera variante) de cada grupo.
   * Expandimos a todas las _keys de cada grupo antes de pasar a combineIntoGroup
   * para que TODAS las variantes de un grupo queden en el mismo superset_group.
   */
  const handleConfirmCombine = useCallback(() => {
    if (combineSelectedKeys.size < 2) return;
    setBlocks((prev) => {
      // Expandir primaryKeys → todas las _keys del grupo de variantes correspondiente
      const groups = groupVariants(prev);
      const expandedKeys = new Set<string>();
      for (const primaryKey of combineSelectedKeys) {
        const group = groups.find((g) => g.variants[0]?._key === primaryKey);
        if (group) {
          group.variants.forEach((v) => expandedKeys.add(v._key));
        } else {
          expandedKeys.add(primaryKey);
        }
      }
      return combineIntoGroup(prev, expandedKeys);
    });
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

  // ─── Agrupamiento: variantes por order_index, luego supersets ────────────────

  // Suprimir warnings de groupBySupersetGroup (ya no se usa; se reemplazó por groupVariants)
  void groupBySupersetGroup;

  // Paso 1: agrupar por order_index (grupos de variantes).
  // La función groupVariants ordena por order_index y luego por variant_order.
  const variantGroupsForRender = groupVariants(blocks);

  // Paso 2: construir el renderOrder considerando supersets.
  // Un "grupo de variantes" (ExerciseBlock) puede ser parte de un superset_group UUID.
  // El superset_group es uniforme dentro del grupo de variantes (todas las variantes
  // de un order_index deben tener el mismo superset_group o ninguna).
  const renderedSupersetIds = new Set<string>();

  const renderOrder: Array<
    | { type: "variantGroup"; variantGroup: typeof variantGroupsForRender[number] }
    | { type: "superset"; groupId: string; memberVariantGroups: typeof variantGroupsForRender }
  > = [];

  for (const vg of variantGroupsForRender) {
    // Tomar el superset_group de la primera variante (todas comparten el mismo)
    const sg = vg.variants[0]?.superset_group ?? null;
    if (sg) {
      if (!renderedSupersetIds.has(sg)) {
        renderedSupersetIds.add(sg);
        // Recopilar todos los grupos de variantes que pertenecen a este superset_group
        const memberVariantGroups = variantGroupsForRender.filter(
          (g) => g.variants[0]?.superset_group === sg
        );
        renderOrder.push({ type: "superset", groupId: sg, memberVariantGroups });
      }
    } else {
      renderOrder.push({ type: "variantGroup", variantGroup: vg });
    }
  }

  const totalVisualGroups = renderOrder.length;

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

      {/* Lista de ejercicios — agrupados por order_index (variantes) y superset_group */}
      <div className="flex flex-col gap-sm">
        {renderOrder.map((item) => {
          if (item.type === "superset") {
            const groupStartIndex = displayIndex;
            displayIndex += item.memberVariantGroups.length;
            return (
              <SupersetGroupSection
                key={`sg-${item.groupId}`}
                memberCount={item.memberVariantGroups.length}
                combineMode={combineMode}
                readOnly={readOnly}
                onUngroup={!readOnly ? () => handleUngroupSuperset(item.groupId) : undefined}
              >
                {item.memberVariantGroups.map((vg, memberIdx) => {
                  const gIdx = groupStartIndex + memberIdx;
                  // Para combine mode, la selección usa la _key de la primera variante
                  const primaryKey = vg.variants[0]?._key ?? vg.groupKey;
                  return (
                    <ExerciseBlock
                      key={vg.groupKey}
                      variants={vg.variants}
                      groupIndex={gIdx}
                      totalGroups={totalVisualGroups}
                      readOnly={readOnly || combineMode}
                      defaultExpanded={false}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                      onReorderGroup={handleReorderGroup}
                      onAddVariant={handleAddVariant}
                      onRemoveFromGroup={
                        !readOnly
                          ? () => {
                              // Sacar todas las variantes del grupo del superset
                              for (const v of vg.variants) {
                                handleRemoveFromGroup(v._key);
                              }
                            }
                          : undefined
                      }
                      combineMode={combineMode}
                      combineSelected={combineSelectedKeys.has(primaryKey)}
                      onToggleCombineSelect={() => handleToggleCombineSelect(primaryKey)}
                    />
                  );
                })}
              </SupersetGroupSection>
            );
          } else {
            const idx = displayIndex++;
            const vg = item.variantGroup;
            const primaryKey = vg.variants[0]?._key ?? vg.groupKey;
            return (
              <ExerciseBlock
                key={vg.groupKey}
                variants={vg.variants}
                groupIndex={idx}
                totalGroups={totalVisualGroups}
                readOnly={readOnly || combineMode}
                defaultExpanded={false}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onReorderGroup={handleReorderGroup}
                onAddVariant={handleAddVariant}
                onStartCombine={!readOnly ? () => handleStartCombine(primaryKey) : undefined}
                combineMode={combineMode}
                combineSelected={combineSelectedKeys.has(primaryKey)}
                onToggleCombineSelect={() => handleToggleCombineSelect(primaryKey)}
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
