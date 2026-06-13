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
import { Save } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import {
  ExerciseBlock,
  ExerciseBlockData,
  routineExerciseToBlock,
} from "@/components/routines/ExerciseBlock";
import { editableToRoutineSet } from "@/components/routines/SetsTable";
import { resolveVariablesConfig } from "@/lib/exercise-presets";
import { groupBySupersetGroup } from "@/lib/superset-grouping";
import { getErrorMessage } from "@/lib/utils";

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
  /** Callback al guardar el snapshot */
  onSave: (
    wkRtId: number,
    exercises: Array<Record<string, unknown>>
  ) => Promise<void>;
  /** Para mostrar estado de carga inicial si los ejercicios no están cargados aún */
  loading?: boolean;
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
 * Incluye superset_group si el ejercicio lo tiene.
 */
function buildExercisesPayload(
  blocks: ExerciseBlockData[],
  originalExercises: PlanningWeekRoutineExercise[]
): Array<Record<string, unknown>> {
  const supersetGroupMap = new Map<string, string | null>();
  for (const ex of originalExercises) {
    supersetGroupMap.set(String(ex.id), ex.superset_group ?? null);
  }

  return blocks.map((block, idx) => {
    const config = resolveVariablesConfig(
      block.variables_config,
      block.exercise_type
    );
    const sets = block.sets.map((s) => editableToRoutineSet(s, config));

    const supersetGroup = supersetGroupMap.get(block._key) ?? null;

    return {
      exercise_id: block.exercise_id,
      name: block.name,
      order_index: idx,
      series: block.sets.length,
      repetitions:
        (block.sets[0] as Record<string, unknown>)?.reps != null
          ? Number((block.sets[0] as Record<string, unknown>).reps)
          : 0,
      exercise_type: block.exercise_type,
      is_warmup: block.is_warmup,
      sets_data: sets,
      variables_config: block.variables_config,
      superset_group: supersetGroup,
    } as Record<string, unknown>;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const WeekRoutineExercisesEditor: React.FC<
  WeekRoutineExercisesEditorProps
> = ({ weekRoutine, readOnly = false, onSave, loading = false }) => {
  const [blocks, setBlocks] = useState<ExerciseBlockData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true);
    setSaveError(null);
    setSavedSuccess(false);
    try {
      const payload = buildExercisesPayload(blocks, weekRoutine.exercises);
      await onSave(weekRoutine.id, payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo guardar el snapshot."));
    } finally {
      setSaving(false);
    }
  };

  // ─── Agrupamiento de supersets ────────────────────────────────────────────

  const { groups } = groupBySupersetGroup(
    weekRoutine.exercises.map((ex) => ({ ...ex, _key: String(ex.id) }))
  );

  const blocksSupersetGroup = new Map<string, string>();
  for (const ex of weekRoutine.exercises) {
    if (ex.superset_group) {
      blocksSupersetGroup.set(String(ex.id), ex.superset_group);
    }
  }

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

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-fg-tertiary py-md text-center">
        Esta rutina no tiene ejercicios en el snapshot.
      </p>
    );
  }

  let displayIndex = 0;
  // Total de grupos visuales (para el OrderBadge)
  const totalVisualGroups = renderOrder.length;

  // Suprimir warning de groups no usado (se usa en agrupamiento superset más arriba)
  void groups;

  return (
    <div className="flex flex-col gap-md">
      {saveError && <ErrorBanner message={saveError} dismissible />}

      {/* Lista de ejercicios */}
      <div className="flex flex-col gap-sm">
        {renderOrder.map((item) => {
          if (item.type === "superset") {
            const groupStartIndex = displayIndex;
            displayIndex += item.memberBlocks.length;
            return (
              <div
                key={`sg-${item.groupId}`}
                className="rounded-lg overflow-hidden"
                style={{
                  border: "2px solid var(--primary-alpha-20)",
                  background: "var(--card)",
                }}
              >
                <div
                  className="px-xl py-xs"
                  style={{ borderBottom: "1px solid var(--separator-subtle)" }}
                >
                  <Badge variant="purple" size="sm">
                    Superset
                  </Badge>
                </div>
                <div className="flex flex-col gap-0">
                  {item.memberBlocks.map((block, memberIdx) => {
                    const gIdx = groupStartIndex + memberIdx;
                    return (
                      <ExerciseBlock
                        key={block._key}
                        variants={[block]}
                        groupIndex={gIdx}
                        totalGroups={totalVisualGroups}
                        readOnly={readOnly}
                        onUpdate={handleUpdate}
                        onRemove={handleRemove}
                        onReorderGroup={handleReorderGroup}
                        onAddVariant={handleAddVariant}
                      />
                    );
                  })}
                </div>
              </div>
            );
          } else {
            const idx = displayIndex++;
            return (
              <ExerciseBlock
                key={item.block._key}
                variants={[item.block]}
                groupIndex={idx}
                totalGroups={totalVisualGroups}
                readOnly={readOnly}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onReorderGroup={handleReorderGroup}
                onAddVariant={handleAddVariant}
              />
            );
          }
        })}
      </div>

      {/* Barra de guardado */}
      {!readOnly && (
        <div
          className="flex items-center justify-between gap-md px-xl py-md rounded-lg"
          style={{ background: "var(--fill-tertiary)" }}
        >
          <span className="text-xs text-fg-secondary">
            {savedSuccess
              ? "Snapshot guardado."
              : "Editá los ejercicios del snapshot de esta semana."}
          </span>
          <Button
            variant={savedSuccess ? "success" : "primary"}
            size="sm"
            loading={saving}
            onClick={handleSave}
            iconLeft={saving ? undefined : <Save size={14} />}
          >
            {savedSuccess ? "Guardado" : "Guardar snapshot"}
          </Button>
        </div>
      )}
    </div>
  );
};
