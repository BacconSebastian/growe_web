"use client";

/**
 * PlanningWeekDetail.tsx
 *
 * Editor de UNA semana: calendario semanal estilo StudentWeeklyProgress con
 * celdas clickeables (grid-cols-7). Máximo 1 rutina por día.
 *
 * Click en celda VACÍA → abrir picker de rutinas (día preseleccionado).
 * Click en celda CON rutina → Modal con WeekRoutineExercisesEditor + "Quitar rutina".
 *
 * Rutinas sin día: pills debajo del calendario, clickeables para editar.
 *
 * REGLA CRÍTICA: el payload SIEMPRE incluye TODAS las rutinas de la semana,
 * incluidas las read-only (created_by !== currentUserId), o el backend las borra implícitamente.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Copy, ClipboardPaste } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/utils";

import { WeekRoutineExercisesEditor } from "./WeekRoutineExercisesEditor";
import { RoutineDayCard, IconButton } from "./RoutineDayCard";
import { pasteRoutineIntoWeek } from "@/lib/planning-week-paste";

import {
  saveWeekRoutines,
  assignRoutineToWeek,
  removeRoutineFromWeek,
  type SaveWeekRoutineInput,
  type AssignRoutineToWeekPayload,
} from "@/lib/api/plannings";
import {
  coachAssignRoutineToWeek,
  coachRemoveRoutineFromWeek,
  coachSaveWeekRoutines,
  createAndAssignStudentRoutine,
  listStudentRoutines,
} from "@/lib/api/coaching";
import { listRoutines } from "@/lib/api/routines";

import type { PlanningWeek, PlanningWeekRoutine, PlanningWeekRoutineExercise, DayOfWeek } from "@/lib/api/types";
import type { RoutineClipboard } from "@/components/plannings/PlanningOverview";

// ─── Constantes de calendario ─────────────────────────────────────────────────

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const DAYS_OF_WEEK: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanningWeekDetailProps {
  mode: "own" | "coach";
  studentId?: number;
  planningId: number;
  week: PlanningWeek;
  currentUserId: number;
  onWeekUpdated: (updated: PlanningWeek) => void;
  /** Clipboard de día (in-memory) — viene de PlanningOverview para sobrevivir ◀▶. */
  routineClipboard?: RoutineClipboard | null;
  /** Callback para copiar el contenido de una rutina al clipboard de día. */
  onCopyRoutine?: (wkRt: PlanningWeekRoutine) => void;
  /**
   * Semana N-1 (la inmediatamente anterior por week_number). Usada para derivar
   * la rutina equivalente y pasarla al editor de ejercicios para "pegar semana pasada".
   * undefined = no hay semana anterior (es la primera).
   */
  previousWeek?: PlanningWeek;
}

interface RoutineOption {
  id: number;
  title: string;
}

/** Determina el día efectivo de una PlanningWeekRoutine. */
function effectiveDay(wr: PlanningWeekRoutine): DayOfWeek | null {
  if (wr.day_of_week) return wr.day_of_week as DayOfWeek;
  if (wr.routine_day_of_week && wr.routine_day_of_week.length > 0) return wr.routine_day_of_week[0] as DayOfWeek;
  return null;
}

/** Cuenta ejercicios y series totales de una rutina de semana. */
function routineCounts(wr: PlanningWeekRoutine): { exercises: number; sets: number } {
  const exercises = wr.exercises?.length ?? 0;
  const sets = (wr.exercises ?? []).reduce((acc, ex) => acc + (ex.sets_data?.length ?? ex.series ?? 0), 0);
  return { exercises, sets };
}

// ─── RoutinePickerModal ───────────────────────────────────────────────────────

interface RoutineSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (routineId: number) => void;
  onCreate: () => void;
  routines: RoutineOption[];
  loading: boolean;
  error: string | null;
}

const RoutinePickerModal: React.FC<RoutineSelectorProps> = ({
  open,
  onClose,
  onSelect,
  onCreate,
  routines,
  loading,
  error,
}) => {
  const [search, setSearch] = useState("");
  const filtered = routines.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal open={open} onClose={onClose} title="Asignar rutina" size="md">
      <div className="flex flex-col gap-lg">
        {error && <ErrorBanner message={error} />}
        <Input placeholder="Buscar rutina..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--fill-tertiary)")}
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "var(--fill-quaternary)")
                }
              >
                {r.title}
              </button>
            ))}
          </div>
        )}
        {/* Opción de crear nueva rutina */}
        <div className="pt-sm" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Pencil size={13} />}
            onClick={() => {
              onClose();
              onCreate();
            }}
            className="w-full"
          >
            Crear rutina nueva
          </Button>
        </div>
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

const CreateRoutineModal: React.FC<CreateRoutineModalProps> = ({ open, onClose, onConfirm }) => {
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
    <Modal open={open} onClose={onClose} title="Crear rutina nueva" size="sm" dismissable={!saving}>
      <div className="flex flex-col gap-lg">
        {error && <ErrorBanner message={error} />}
        <div className="flex flex-col gap-xs">
          <label className="text-sm font-medium text-fg-secondary">Nombre de la rutina</label>
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
            <Button variant="ghost" size="sm" disabled={saving} onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const PlanningWeekDetail: React.FC<PlanningWeekDetailProps> = ({
  mode,
  studentId,
  planningId: _planningId,
  week,
  currentUserId,
  onWeekUpdated,
  routineClipboard,
  onCopyRoutine,
  previousWeek,
}) => {
  const [routinePickerOpen, setRoutinePickerOpen] = useState(false);
  const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
  const [routineOptions, setRoutineOptions] = useState<RoutineOption[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(false);
  const [routinesError, setRoutinesError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Día destino para el picker/crear (null = "sin día asignado")
  const [pendingDay, setPendingDay] = useState<DayOfWeek | null>(null);

  // Rutina seleccionada → se muestra inline debajo del calendario (no modal)
  const [selectedWkRtId, setSelectedWkRtId] = useState<number | null>(null);

  // Primera rutina por día efectivo (máx 1 visible por celda)
  const routineByDay = useMemo(() => {
    const map = new Map<DayOfWeek, PlanningWeekRoutine>();
    for (const wr of week.routines) {
      const day = effectiveDay(wr);
      if (day !== null && !map.has(day)) {
        map.set(day, wr);
      }
    }
    return map;
  }, [week.routines]);

  // La rutina seleccionada se deriva de week.routines (siempre fresca tras editar/quitar)
  const selectedWkRt = useMemo(
    () => week.routines.find((r) => r.id === selectedWkRtId) ?? null,
    [week.routines, selectedWkRtId],
  );

  const unassignedRoutines = useMemo(() => week.routines.filter((wr) => effectiveDay(wr) === null), [week.routines]);

  /**
   * Ejercicios de la rutina equivalente de la semana anterior (N-1), derivados en
   * memoria a partir de `previousWeek`.
   * Matching: primero por día efectivo; fallback por título normalizado.
   * Se usa en WeekRoutineExercisesEditor para "Pegar valores de semana pasada".
   */
  const prevExercisesForSelected = useMemo<PlanningWeekRoutineExercise[] | null>(() => {
    if (!selectedWkRt || !previousWeek) return null;
    const targetDay = effectiveDay(selectedWkRt);
    if (targetDay) {
      const matchByDay = previousWeek.routines.find((r) => effectiveDay(r) === targetDay);
      if (matchByDay) return matchByDay.exercises ?? [];
    }
    // Fallback: por título normalizado
    const titleNorm = selectedWkRt.routine_title.trim().toLowerCase();
    const matchByTitle = previousWeek.routines.find((r) => r.routine_title.trim().toLowerCase() === titleNorm);
    return matchByTitle?.exercises ?? null;
  }, [selectedWkRt, previousWeek]);

  // Cargar opciones de rutina
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
      setRoutinesError(getErrorMessage(err, "No se pudieron cargar las rutinas."));
    } finally {
      setRoutinesLoading(false);
    }
  }, [mode, studentId]);

  const handleOpenRoutinePicker = useCallback(
    (day: DayOfWeek | null) => {
      setPendingDay(day);
      loadRoutineOptions();
      setRoutinePickerOpen(true);
    },
    [loadRoutineOptions],
  );

  const handleOpenCreateRoutine = useCallback((day: DayOfWeek | null) => {
    setPendingDay(day);
    setCreateRoutineOpen(true);
  }, []);

  // Selecciona/deselecciona la rutina de un día (toggle) → panel inline abajo
  const handleSelectDayRoutine = (wr: PlanningWeekRoutine) => {
    setSelectedWkRtId((prev) => (prev === wr.id ? null : wr.id));
  };

  // Asignar rutina existente a la semana (con día)
  const handleAssignRoutine = async (routineId: number) => {
    setActionError(null);
    try {
      const payload: AssignRoutineToWeekPayload = {
        routine_id: routineId,
        day_of_week: pendingDay ?? undefined,
      };
      let newWkRt: PlanningWeekRoutine;

      if (mode === "coach" && studentId != null) {
        newWkRt = await coachAssignRoutineToWeek(studentId, week.id, payload);
      } else {
        newWkRt = await assignRoutineToWeek(week.id, payload);
      }

      onWeekUpdated({
        ...week,
        routines: [...week.routines, newWkRt],
      });
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo asignar la rutina."));
    }
  };

  // Crear rutina nueva en la semana (con día)
  const handleCreateRoutine = async (title: string) => {
    setActionError(null);
    if (mode === "coach" && studentId != null) {
      const newWkRt = await createAndAssignStudentRoutine(studentId, week.id, {
        title,
        day_of_week: pendingDay ?? undefined,
      });
      onWeekUpdated({
        ...week,
        routines: [...week.routines, newWkRt],
      });
    } else {
      const existingRoutineInputs: SaveWeekRoutineInput[] = week.routines.map((r) => ({
        week_routine_id: r.id,
        routine_id: r.routine_id,
        title: r.routine_title,
        day_of_week: effectiveDay(r),
        order_index: r.order_index,
        exercises: r.exercises.map((ex, idx) => ({
          exercise_id: ex.exercise_id,
          name: ex.name,
          order_index: idx + 1,
          series: ex.series,
          repetitions: ex.repetitions,
          exercise_type: ex.exercise_type,
          is_warmup: ex.is_warmup,
          sets_data: ex.sets_data,
          variables_config: ex.variables_config,
          superset_group: ex.superset_group,
        })),
      }));

      const newRoutineInput: SaveWeekRoutineInput = {
        week_routine_id: null,
        routine_id: null,
        title,
        day_of_week: pendingDay ?? undefined,
        exercises: [],
      };

      const updatedWeek = await saveWeekRoutines(week.id, [...existingRoutineInputs, newRoutineInput]);
      onWeekUpdated(updatedWeek);
    }
  };

  // Quitar rutina de la semana
  const handleRemoveRoutine = async (wkRtId: number) => {
    setActionError(null);
    if (mode === "coach" && studentId != null) {
      await coachRemoveRoutineFromWeek(studentId, wkRtId);
    } else {
      await removeRoutineFromWeek(wkRtId);
    }
    onWeekUpdated({
      ...week,
      routines: week.routines.filter((r) => r.id !== wkRtId),
    });
    if (selectedWkRtId === wkRtId) setSelectedWkRtId(null);
  };

  // Mapea los ejercicios de una rutina al shape de SaveWeekRoutineInput
  const mapRoutineExercisesToInput = (exercises: PlanningWeekRoutine["exercises"]): Array<Record<string, unknown>> =>
    exercises.map((ex, idx) => ({
      exercise_id: ex.exercise_id,
      name: ex.name,
      order_index: idx + 1,
      series: ex.series,
      repetitions: ex.repetitions,
      exercise_type: ex.exercise_type,
      is_warmup: ex.is_warmup,
      sets_data: ex.sets_data,
      variables_config: ex.variables_config,
      superset_group: ex.superset_group,
    }));

  /**
   * Guarda el snapshot de UNA rutina (nombre + ejercicios) vía saveWeekRoutines.
   * REGLA CRÍTICA: incluye TODAS las rutinas de la semana (las no editadas con su
   * data actual) para que el backend no las borre implícitamente.
   */
  const handleSaveRoutine = async (wkRtId: number, title: string, exercises: Array<Record<string, unknown>>) => {
    const payload: SaveWeekRoutineInput[] = week.routines.map((r) => ({
      week_routine_id: r.id,
      routine_id: r.routine_id,
      title: r.id === wkRtId ? title : r.routine_title,
      day_of_week: effectiveDay(r),
      order_index: r.order_index,
      exercises: r.id === wkRtId ? exercises : mapRoutineExercisesToInput(r.exercises),
    }));

    const updatedWeek =
      mode === "coach" && studentId != null
        ? await coachSaveWeekRoutines(studentId, week.id, payload)
        : await saveWeekRoutines(week.id, payload);

    onWeekUpdated(updatedWeek);
  };

  /**
   * Pega el contenido del clipboard de día en una celda.
   *
   * - targetWkRt !== null → reemplaza los ejercicios de esa rutina (mantiene su
   *   título). Se envía el payload completo de TODAS las rutinas de la semana.
   * - targetWkRt === null, targetDay proporcionado → crea rutina nueva en ese día
   *   con el título y ejercicios del clipboard.
   *
   * REGLA CRÍTICA: el payload siempre incluye TODAS las rutinas de la semana.
   */
  const handlePasteRoutine = useCallback(
    async (targetWkRt: PlanningWeekRoutine | null, targetDay: DayOfWeek | null) => {
      if (!routineClipboard) return;
      setActionError(null);
      try {
        const updatedWeek = await pasteRoutineIntoWeek({
          clipboardTitle: routineClipboard.title,
          clipboardExercises: routineClipboard.exercises,
          week,
          mode,
          studentId,
          targetWkRt,
          targetDay,
        });
        onWeekUpdated(updatedWeek);
      } catch (err) {
        setActionError(getErrorMessage(err, "No se pudo pegar la rutina."));
      }
    },
    [routineClipboard, week, mode, studentId, onWeekUpdated],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-lg">
      {actionError && <ErrorBanner message={actionError} dismissible />}

      {/* ── Calendario semanal editable (grid-cols-7) ── */}
      <GradientSurface>
        <div className="p-xl flex flex-col gap-sm">
          <div className="grid grid-cols-7 gap-xs">
            {DAYS_OF_WEEK.map((dow, i) => {
              const wr = routineByDay.get(dow);
              const counts = wr ? routineCounts(wr) : null;
              const canEditCell =
                mode === "own" || (mode === "coach" && wr !== undefined && wr.created_by === currentUserId);

              return (
                <div key={dow} className="flex flex-col items-center gap-xs">
                  {/* Label del día */}
                  <span className="text-xxs font-medium" style={{ color: "var(--fg-tertiary)" }}>
                    {DAY_LABELS[i]}
                  </span>

                  {/* Celda con rutina */}
                  {wr && counts ? (
                    <RoutineDayCard
                      title={wr.routine_title}
                      exercises={counts.exercises}
                      sets={counts.sets}
                      selected={selectedWkRtId === wr.id}
                      onClick={() => handleSelectDayRoutine(wr)}
                      titleAttr={`${wr.routine_title}${canEditCell ? " · click para editar" : " · click para ver"}`}
                      metaOverlay={
                        <>
                          {/* Copiar — siempre disponible */}
                          {onCopyRoutine && (
                            <IconButton
                              title="Copiar contenido del día"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopyRoutine(wr);
                              }}
                            >
                              <Copy size={13} />
                            </IconButton>
                          )}
                          {/* Pegar — solo si hay clipboard y se puede editar la celda */}
                          {routineClipboard && canEditCell && (
                            <IconButton
                              title={`Pegar "${routineClipboard.title}" aquí`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePasteRoutine(wr, effectiveDay(wr));
                              }}
                            >
                              <ClipboardPaste size={13} />
                            </IconButton>
                          )}
                        </>
                      }
                    />
                  ) : (
                    /* Celda vacía */
                    <div className="w-full relative group">
                      <button
                        type="button"
                        onClick={() => handleOpenRoutinePicker(dow)}
                        className="w-full flex flex-col items-center justify-center rounded-lg px-xs text-center transition-colors hover:bg-fill-tertiary"
                        style={{
                          minHeight: "84px",
                          background: "transparent",
                          border: "1px dashed var(--separator)",
                          cursor: "pointer",
                        }}
                        title="Asignar rutina a este día"
                      >
                        <span className="text-xl font-bold leading-none" style={{ color: "var(--fg-tertiary)" }}>
                          +
                        </span>
                      </button>
                      {/* Botón pegar en celda vacía */}
                      {routineClipboard && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <IconButton
                            title={`Pegar "${routineClipboard.title}" aquí`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePasteRoutine(null, dow);
                            }}
                          >
                            <ClipboardPaste size={13} />
                          </IconButton>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rutinas sin día: pills debajo del calendario */}
          {unassignedRoutines.length > 0 && (
            <div className="flex items-center gap-xs flex-wrap pt-xs">
              <span className="text-xxs font-semibold uppercase tracking-wide" style={{ color: "var(--fg-tertiary)" }}>
                Sin día:
              </span>
              {unassignedRoutines.map((wr) => {
                const canEditPill = mode === "own" || (mode === "coach" && wr.created_by === currentUserId);
                return (
                  <div key={wr.id} className="flex items-center gap-xxs">
                    <button
                      type="button"
                      onClick={() => handleSelectDayRoutine(wr)}
                      className="text-xs font-medium px-sm py-xxs rounded-pill transition-opacity hover:opacity-80"
                      style={{
                        background: canEditPill ? "var(--primary-alpha-12)" : "var(--fill-tertiary)",
                        color: canEditPill ? "var(--primary)" : "var(--fg-secondary)",
                        outline: selectedWkRtId === wr.id ? "2px solid var(--primary)" : undefined,
                      }}
                    >
                      {wr.routine_title}
                    </button>
                    {/* Copiar pill — siempre disponible */}
                    {onCopyRoutine && (
                      <IconButton
                        title="Copiar contenido de esta rutina"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyRoutine(wr);
                        }}
                      >
                        <Copy size={13} />
                      </IconButton>
                    )}
                    {/* Pegar en pill — reemplaza ejercicios si es editable */}
                    {routineClipboard && canEditPill && (
                      <IconButton
                        title={`Pegar "${routineClipboard.title}" aquí`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePasteRoutine(wr, null);
                        }}
                      >
                        <ClipboardPaste size={13} />
                      </IconButton>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state: semana sin ninguna rutina */}
          {week.routines.length === 0 && (
            <p className="text-sm text-center mt-sm m-0" style={{ color: "var(--fg-tertiary)" }}>
              Tocá un día del calendario para asignar una rutina.
            </p>
          )}
        </div>
      </GradientSurface>

      {/* ── Editor de la rutina del día seleccionado (barra + ejercicios, inline) ── */}
      {selectedWkRt && (
        <WeekRoutineExercisesEditor
          key={selectedWkRt.id}
          weekRoutine={selectedWkRt}
          readOnly={!(mode === "own" || (mode === "coach" && selectedWkRt.created_by === currentUserId))}
          mode={mode}
          studentId={studentId}
          prevExercises={prevExercisesForSelected ?? undefined}
          onSave={handleSaveRoutine}
          onDelete={handleRemoveRoutine}
        />
      )}

      {/* Modals */}
      <RoutinePickerModal
        open={routinePickerOpen}
        onClose={() => setRoutinePickerOpen(false)}
        onSelect={handleAssignRoutine}
        onCreate={() => handleOpenCreateRoutine(pendingDay)}
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
