"use client";

/**
 * PlanningWeekDetail.tsx
 *
 * Editor de UNA semana: muestra las PlanningWeekRoutine[], permite asignar/quitar
 * rutinas, y editar el snapshot de ejercicios de cada una.
 *
 * Guarda con saveWeekRoutines (declarativo, 1 request).
 * REGLA CRÍTICA: el payload SIEMPRE incluye TODAS las rutinas de la semana,
 * incluidas las read-only (created_by !== currentUserId), o el backend las borra implícitamente.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

import { WeekRoutineExercisesEditor } from "./WeekRoutineExercisesEditor";

import {
  saveWeekRoutines,
  assignRoutineToWeek,
  removeRoutineFromWeek,
  updateWeekRoutineExercises,
  type SaveWeekRoutineInput,
  type AssignRoutineToWeekPayload,
} from "@/lib/api/plannings";
import {
  coachAssignRoutineToWeek,
  coachRemoveRoutineFromWeek,
  coachUpdateWeekRoutineExercises,
  createAndAssignStudentRoutine,
  listStudentRoutines,
} from "@/lib/api/coaching";
import { listRoutines } from "@/lib/api/routines";

import type {
  PlanningWeek,
  PlanningWeekRoutine,
} from "@/lib/api/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanningWeekDetailProps {
  mode: "own" | "coach";
  studentId?: number;
  planningId: number;
  week: PlanningWeek;
  currentUserId: number;
  onWeekUpdated: (updated: PlanningWeek) => void;
}

interface RoutineOption {
  id: number;
  title: string;
}

// ─── RoutineSelector modal (simple, reutilizable) ────────────────────────────

interface RoutineSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (routineId: number) => void;
  routines: RoutineOption[];
  loading: boolean;
  error: string | null;
}

const RoutinePickerModal: React.FC<RoutineSelectorProps> = ({
  open,
  onClose,
  onSelect,
  routines,
  loading,
  error,
}) => {
  const [search, setSearch] = useState("");
  const filtered = routines.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal open={open} onClose={onClose} title="Asignar rutina" size="md">
      <div className="flex flex-col gap-lg">
        {error && <ErrorBanner message={error} />}
        <Input
          placeholder="Buscar rutina..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading ? (
          <div className="flex flex-col gap-sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLine key={i} height={44} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-fg-tertiary text-center py-lg">
            {search ? "Sin resultados." : "No hay rutinas disponibles."}
          </p>
        ) : (
          <div className="flex flex-col gap-xs max-h-72 overflow-y-auto">
            {filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelect(r.id);
                  onClose();
                }}
                className="text-left px-lg py-md rounded-md text-sm font-medium text-fg transition-colors"
                style={{ background: "var(--fill-quaternary)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "var(--fill-tertiary)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "var(--fill-quaternary)")
                }
              >
                {r.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─── CreateRoutineModal ───────────────────────────────────────────────────────

interface CreateRoutineModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (title: string) => Promise<void>;
}

const CreateRoutineModal: React.FC<CreateRoutineModalProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(title.trim());
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo crear la rutina."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear rutina nueva"
      size="sm"
      dismissable={!saving}
    >
      <div className="flex flex-col gap-lg">
        {error && <ErrorBanner message={error} />}
        <div className="flex flex-col gap-xs">
          <label className="text-sm font-medium text-fg-secondary">
            Nombre de la rutina
          </label>
          <Input
            placeholder="Ej: Push A"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-sm">
          <Button
            variant="primary"
            size="md"
            loading={saving}
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="w-full"
          >
            Crear rutina
          </Button>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ─── RoutineRow ───────────────────────────────────────────────────────────────

interface RoutineRowProps {
  weekRoutine: PlanningWeekRoutine;
  canEdit: boolean;
  mode: "own" | "coach";
  studentId?: number;
  onRemove: (wkRtId: number) => void;
  onSaveExercises: (
    wkRtId: number,
    exercises: Array<Record<string, unknown>>
  ) => Promise<void>;
}

const RoutineRow: React.FC<RoutineRowProps> = ({
  weekRoutine,
  canEdit,
  mode,
  studentId,
  onRemove,
  onSaveExercises,
}) => {
  const [expanded, setExpanded] = useState(false);

  const exerciseCount = weekRoutine.exercises.length;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
      }}
    >
      {/* Header de la rutina */}
      <div
        className="flex items-center gap-md px-lg py-md"
        style={{ borderBottom: expanded ? "1px solid var(--separator-subtle)" : undefined }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-md text-left min-w-0"
        >
          <div
            className="w-8 h-8 rounded-pill flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{
              background: "var(--primary-alpha-12)",
              color: "var(--primary)",
            }}
          >
            {exerciseCount}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg m-0 truncate">
              {weekRoutine.routine_title}
            </p>
            {weekRoutine.day_of_week && (
              <p className="text-xs text-fg-tertiary m-0">
                {weekRoutine.day_of_week}
              </p>
            )}
          </div>
          {!canEdit && (
            <Badge variant="neutral" size="sm">
              Solo lectura
            </Badge>
          )}
          <span className="text-fg-tertiary">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {/* Botón eliminar rutina (solo si editable) */}
        {canEdit && (
          <button
            type="button"
            onClick={() => onRemove(weekRoutine.id)}
            className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-destructive transition-colors flex-shrink-0"
            style={{ background: "var(--fill-tertiary)" }}
            title="Quitar rutina de esta semana"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Panel de ejercicios */}
      {expanded && (
        <div className="px-lg py-md">
          <WeekRoutineExercisesEditor
            weekRoutine={weekRoutine}
            readOnly={!canEdit}
            onSave={onSaveExercises}
          />
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const PlanningWeekDetail: React.FC<PlanningWeekDetailProps> = ({
  mode,
  studentId,
  planningId,
  week,
  currentUserId,
  onWeekUpdated,
}) => {
  const [routinePickerOpen, setRoutinePickerOpen] = useState(false);
  const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
  const [routineOptions, setRoutineOptions] = useState<RoutineOption[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(false);
  const [routinesError, setRoutinesError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Cargar opciones de rutina al abrir el picker
  const loadRoutineOptions = useCallback(async () => {
    setRoutinesLoading(true);
    setRoutinesError(null);
    try {
      if (mode === "coach" && studentId != null) {
        const items = await listStudentRoutines(studentId);
        setRoutineOptions(items.map((r) => ({ id: r.id, title: r.title })));
      } else {
        const res = await listRoutines({ page: 1 });
        setRoutineOptions(res.items.map((r) => ({ id: r.id, title: r.title })));
      }
    } catch (err) {
      setRoutinesError(
        getErrorMessage(err, "No se pudieron cargar las rutinas.")
      );
    } finally {
      setRoutinesLoading(false);
    }
  }, [mode, studentId]);

  const handleOpenRoutinePicker = () => {
    loadRoutineOptions();
    setRoutinePickerOpen(true);
  };

  // Asignar rutina existente a la semana
  const handleAssignRoutine = async (routineId: number) => {
    setActionError(null);
    try {
      const payload: AssignRoutineToWeekPayload = { routine_id: routineId };
      let newWkRt: PlanningWeekRoutine;

      if (mode === "coach" && studentId != null) {
        newWkRt = await coachAssignRoutineToWeek(studentId, week.id, payload);
      } else {
        newWkRt = await assignRoutineToWeek(week.id, payload);
      }

      // Actualizar semana local
      onWeekUpdated({
        ...week,
        routines: [...week.routines, newWkRt],
      });
    } catch (err) {
      setActionError(
        getErrorMessage(err, "No se pudo asignar la rutina.")
      );
    }
  };

  // Crear rutina nueva en la semana (coach: atómico; owner: por saveWeekRoutines)
  const handleCreateRoutine = async (title: string) => {
    setActionError(null);
    if (mode === "coach" && studentId != null) {
      const newWkRt = await createAndAssignStudentRoutine(studentId, week.id, {
        title,
      });
      onWeekUpdated({
        ...week,
        routines: [...week.routines, newWkRt],
      });
    } else {
      // owner: usar saveWeekRoutines con nueva rutina sin week_routine_id
      const existingRoutineInputs: SaveWeekRoutineInput[] = week.routines.map(
        (r) => ({
          week_routine_id: r.id,
          routine_id: r.routine_id,
          title: r.routine_title,
          day_of_week: r.day_of_week,
          order_index: r.order_index,
          exercises: r.exercises.map((ex, idx) => ({
            exercise_id: ex.exercise_id,
            name: ex.name,
            order_index: idx,
            series: ex.series,
            repetitions: ex.repetitions,
            exercise_type: ex.exercise_type,
            is_warmup: ex.is_warmup,
            sets_data: ex.sets_data,
            variables_config: ex.variables_config,
            superset_group: ex.superset_group,
          })),
        })
      );

      const newRoutineInput: SaveWeekRoutineInput = {
        week_routine_id: null,
        routine_id: null,
        title,
        exercises: [],
      };

      const updatedWeek = await saveWeekRoutines(week.id, [
        ...existingRoutineInputs,
        newRoutineInput,
      ]);
      onWeekUpdated(updatedWeek);
    }
  };

  // Quitar rutina de la semana
  const handleRemoveRoutine = async (wkRtId: number) => {
    setActionError(null);
    try {
      if (mode === "coach" && studentId != null) {
        await coachRemoveRoutineFromWeek(studentId, wkRtId);
      } else {
        await removeRoutineFromWeek(wkRtId);
      }
      onWeekUpdated({
        ...week,
        routines: week.routines.filter((r) => r.id !== wkRtId),
      });
    } catch (err) {
      setActionError(
        getErrorMessage(err, "No se pudo quitar la rutina.")
      );
    }
  };

  // Guardar snapshot de ejercicios de una rutina
  const handleSaveExercises = async (
    wkRtId: number,
    exercises: Array<Record<string, unknown>>
  ) => {
    if (mode === "coach" && studentId != null) {
      await coachUpdateWeekRoutineExercises(studentId, wkRtId, {
        exercises: exercises as Parameters<typeof coachUpdateWeekRoutineExercises>[2]["exercises"],
      });
    } else {
      await updateWeekRoutineExercises(wkRtId, {
        exercises: exercises as Parameters<typeof updateWeekRoutineExercises>[1]["exercises"],
      });
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const routines = week.routines;
  const hasRoutines = routines.length > 0;

  return (
    <div className="flex flex-col gap-lg">
      {actionError && (
        <ErrorBanner
          message={actionError}
          dismissible
        />
      )}

      {/* Lista de rutinas */}
      {!hasRoutines ? (
        <div
          className="flex flex-col items-center justify-center gap-md py-xxl rounded-lg"
          style={{
            border: "2px dashed var(--border)",
            background: "var(--fill-quaternary)",
          }}
        >
          <p className="text-sm text-fg-secondary m-0 text-center">
            Esta semana no tiene rutinas asignadas.
          </p>
          <div className="flex items-center gap-sm">
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={handleOpenRoutinePicker}
            >
              Asignar rutina
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Pencil size={14} />}
              onClick={() => setCreateRoutineOpen(true)}
            >
              Crear nueva
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-sm">
            {routines.map((wr) => {
              const canEdit =
                mode === "own" ||
                (mode === "coach" && wr.created_by === currentUserId);
              return (
                <RoutineRow
                  key={wr.id}
                  weekRoutine={wr}
                  canEdit={canEdit}
                  mode={mode}
                  studentId={studentId}
                  onRemove={handleRemoveRoutine}
                  onSaveExercises={handleSaveExercises}
                />
              );
            })}
          </div>

          {/* Acciones para agregar más rutinas */}
          <div className="flex items-center gap-sm flex-wrap">
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={handleOpenRoutinePicker}
            >
              Asignar rutina
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Pencil size={14} />}
              onClick={() => setCreateRoutineOpen(true)}
            >
              Crear nueva
            </Button>
          </div>
        </>
      )}

      {/* Modals */}
      <RoutinePickerModal
        open={routinePickerOpen}
        onClose={() => setRoutinePickerOpen(false)}
        onSelect={handleAssignRoutine}
        routines={routineOptions}
        loading={routinesLoading}
        error={routinesError}
      />
      <CreateRoutineModal
        open={createRoutineOpen}
        onClose={() => setCreateRoutineOpen(false)}
        onConfirm={handleCreateRoutine}
      />
    </div>
  );
};
