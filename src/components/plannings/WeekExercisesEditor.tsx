"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { ExerciseBlock, ExerciseBlockData, routineExerciseToBlock } from "@/components/routines/ExerciseBlock";
import { editableToRoutineSet } from "@/components/routines/SetsTable";
import { resolveVariablesConfig } from "@/lib/exercise-presets";
import { getErrorMessage } from "@/lib/utils";
import {
  getPlanningWeekExercises,
  updatePlanningWeekExercises,
} from "@/lib/api/plannings";
import {
  getStudentPlanningWeekExercises,
  updateStudentPlanningWeekExercises,
} from "@/lib/api/coaching";
import type { PlanningWeekExercise, RoutineExercise } from "@/lib/api/types";

interface WeekExercisesEditorProps {
  open: boolean;
  onClose: () => void;
  planningId: number;
  routineId: number;
  routineTitle: string;
  week: number;
  dayLabel: string;
  /** modo: own = propias del coach, coach = rutina del alumno */
  mode: "own" | "coach";
  studentId?: number;
  readOnly?: boolean;
}

// Convierte PlanningWeekExercise a RoutineExercise (shape compatible con ExerciseBlock)
function weekExerciseToRoutineExercise(we: PlanningWeekExercise): RoutineExercise {
  return {
    id: we.id,
    routine_id: we.routine_id,
    exercise_id: we.exercise_id ?? null,
    name: we.name,
    series: we.series,
    repetitions: we.repetitions,
    weight_kg: we.weight_kg,
    rir: we.rir,
    order_index: we.order_index,
    variant_order: we.variant_order,
    sets_data: we.sets_data,
    exercise_type: we.exercise_type,
    is_warmup: we.is_warmup,
    variables_config: we.variables_config,
    description: we.description,
    exercise: we.exercise,
  };
}

export const WeekExercisesEditor: React.FC<WeekExercisesEditorProps> = ({
  open,
  onClose,
  planningId,
  routineId,
  routineTitle,
  week,
  dayLabel,
  mode,
  studentId,
  readOnly = false,
}) => {
  const [blocks, setBlocks] = useState<ExerciseBlockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setSaveError(null);
      try {
        let exercises: PlanningWeekExercise[];
        if (mode === "coach" && studentId) {
          exercises = await getStudentPlanningWeekExercises(
            studentId,
            planningId,
            week,
            routineId
          );
        } else {
          exercises = await getPlanningWeekExercises(planningId, week, routineId);
        }

        const loaded = exercises
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((we) => routineExerciseToBlock(weekExerciseToRoutineExercise(we)));

        setBlocks(loaded);
      } catch (err) {
        setLoadError(getErrorMessage(err, "No se pudieron cargar los ejercicios."));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, planningId, routineId, week, mode, studentId]);

  const handleUpdateBlock = useCallback(
    (key: string, updated: Partial<ExerciseBlockData>) => {
      setBlocks((prev) =>
        prev.map((b) => (b._key === key ? { ...b, ...updated } : b))
      );
    },
    []
  );

  const handleRemoveBlock = useCallback((key: string) => {
    setBlocks((prev) => prev.filter((b) => b._key !== key));
  }, []);

  const handleMoveUp = useCallback((key: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b._key === key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((key: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b._key === key);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);

    try {
      const exercises = blocks.map((block, idx) => {
        const config = resolveVariablesConfig(block.variables_config, block.exercise_type);
        const sets_data = block.sets.map((s) => editableToRoutineSet(s, config));
        return {
          exercise_id: block.exercise_id ?? null,
          name: block.name,
          series: block.sets.length,
          repetitions: 0,
          exercise_type: block.exercise_type,
          is_warmup: block.is_warmup,
          order_index: idx,
          sets_data,
          variables_config: config,
        };
      });

      const payload = { exercises };

      if (mode === "coach" && studentId) {
        await updateStudentPlanningWeekExercises(
          studentId,
          planningId,
          week,
          routineId,
          payload
        );
      } else {
        await updatePlanningWeekExercises(planningId, week, routineId, payload);
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudieron guardar los ejercicios."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${dayLabel} · Semana ${week} · ${routineTitle}`}
      size="lg"
      dismissable={!saving}
    >
      <div className="flex flex-col gap-lg">
        {loadError && <ErrorBanner message={loadError} />}
        {saveError && <ErrorBanner message={saveError} dismissible />}

        {loading ? (
          <div className="flex flex-col gap-md">
            <SkeletonBox height={120} />
            <SkeletonBox height={120} />
          </div>
        ) : blocks.length === 0 ? (
          <div
            className="rounded-lg p-xxl flex flex-col items-center gap-md text-center"
            style={{
              background: "var(--fill-tertiary)",
              border: "1.5px dashed var(--separator)",
            }}
          >
            <p className="text-base text-fg-secondary m-0">
              Esta semana usa los ejercicios base de la rutina.
            </p>
            <p className="text-sm text-fg-tertiary m-0">
              No hay overrides para la semana {week}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-md">
            {blocks.map((block, idx) => (
              <ExerciseBlock
                key={block._key}
                data={block}
                index={idx}
                totalCount={blocks.length}
                readOnly={readOnly}
                onUpdate={handleUpdateBlock}
                onRemove={handleRemoveBlock}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </div>
        )}

        {!readOnly && !loadError && (
          <div className="flex justify-end gap-sm pt-md" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
            <Button variant="secondary" size="md" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant={savedSuccess ? "success" : "primary"}
              size="md"
              loading={saving}
              onClick={handleSave}
              iconLeft={<Save size={16} />}
            >
              {savedSuccess ? "¡Guardado!" : "Guardar ejercicios"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
