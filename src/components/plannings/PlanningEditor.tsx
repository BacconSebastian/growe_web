"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, Trash2, Lock, Plus, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";

import { PlanningStatusBadge } from "./PlanningStatusBadge";
import { PlanningGrid, CellKey } from "./PlanningGrid";
import { WeekSelector } from "./WeekSelector";
import { RoutineSelectorModal } from "./RoutineSelectorModal";
import { WeekExercisesEditor } from "./WeekExercisesEditor";
import { ActivateDeactivateModal } from "./ActivateDeactivateModal";

import {
  getPlanning,
  createPlanning,
  updatePlanning,
  deletePlanning,
} from "@/lib/api/plannings";
import {
  getStudentPlanning,
  updateStudentPlanning,
} from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { Planning, Routine, DayOfWeek } from "@/lib/api/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PlanningEditorMode = "create-own" | "edit-own" | "edit-coach";

export interface PlanningSeed {
  title?: string;
  description?: string;
}

interface PlanningEditorProps {
  mode: PlanningEditorMode;
  planningId?: number;
  studentId?: number;
  studentName?: string;
  initialSeed?: PlanningSeed;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "El nombre es requerido").max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  total_weeks: z
    .number({ invalid_type_error: "Ingresá un número" })
    .int()
    .min(1, "Mínimo 1 semana")
    .max(52, "Máximo 52 semanas"),
  days_per_week: z
    .number({ invalid_type_error: "Ingresá un número" })
    .int()
    .min(1, "Mínimo 1 día")
    .max(7, "Máximo 7 días"),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_DAYS: { dayIndex: number; dow: DayOfWeek; label: string }[] = [
  { dayIndex: 0, dow: "monday",    label: "Lun" },
  { dayIndex: 1, dow: "tuesday",   label: "Mar" },
  { dayIndex: 2, dow: "wednesday", label: "Mié" },
  { dayIndex: 3, dow: "thursday",  label: "Jue" },
  { dayIndex: 4, dow: "friday",    label: "Vie" },
  { dayIndex: 5, dow: "saturday",  label: "Sáb" },
  { dayIndex: 6, dow: "sunday",    label: "Dom" },
];

function getDayLabel(dayIndex: number): string {
  return ALL_DAYS[dayIndex]?.label ?? `Día ${dayIndex + 1}`;
}

/**
 * Calcula la semana actual de una planning basándose en start_date.
 * Retorna 1 si no hay start_date o la planning no empezó.
 */
function calcCurrentWeek(planning: Planning): number {
  if (planning.current_week_override != null) {
    return planning.current_week_override;
  }
  if (!planning.start_date) return 1;
  const start = new Date(planning.start_date);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return 1;
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(diffWeeks, planning.total_weeks);
}

/**
 * Convierte las PlanningRoutine al mapa de assignments { "week-dayIndex": routineId | null }.
 * El backend guarda las rutinas con assigned_days (DayOfWeek[]).
 * Para overrides por semana no hay un endpoint en PLANNING.md — se usa la estructura base
 * de la rutina (misma rutina en todas las semanas para ese día).
 */
function buildAssignments(
  planning: Planning,
  totalWeeks: number
): Record<CellKey, number | null> {
  const result: Record<CellKey, number | null> = {};

  // Inicializar todo como null (descanso)
  for (let w = 1; w <= totalWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      result[`${w}-${d}`] = null;
    }
  }

  const routines = planning.routines ?? [];
  for (const routine of routines) {
    if (!routine.day_of_week) continue;
    const days = Array.isArray(routine.day_of_week)
      ? routine.day_of_week
      : [routine.day_of_week];

    for (const dow of days) {
      const dayIndex = ALL_DAYS.findIndex((d) => d.dow === dow);
      if (dayIndex < 0) continue;

      // Asignar a todas las semanas
      for (let w = 1; w <= totalWeeks; w++) {
        const key: CellKey = `${w}-${dayIndex}`;
        // Si ya hay una rutina asignada para esta celda, no pisar (primera gana)
        if (result[key] == null) {
          result[key] = routine.id;
        }
      }
    }
  }

  return result;
}

function buildRoutinesById(planning: Planning): Record<number, Routine> {
  const map: Record<number, Routine> = {};
  for (const r of planning.routines ?? []) {
    map[r.id] = r;
  }
  return map;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export const PlanningEditor: React.FC<PlanningEditorProps> = ({
  mode,
  planningId,
  studentId,
  studentName,
  initialSeed,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  // ─── Estado ───────────────────────────────────────────────────────────────

  const [planning, setPlanning] = useState<Planning | null>(null);
  const [loading, setLoading] = useState(mode !== "create-own");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Grid state
  const [assignments, setAssignments] = useState<Record<CellKey, number | null>>({});
  const [routinesById, setRoutinesById] = useState<Record<number, Routine>>({});
  const [currentWeek, setCurrentWeek] = useState(1); // semana real de la planning
  const [viewWeek, setViewWeek] = useState(1); // semana que se está viendo en el grid

  // Modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);

  // Routine selector modal
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorWeek, setSelectorWeek] = useState(1);
  const [selectorDayIndex, setSelectorDayIndex] = useState(0);

  // Week exercises editor modal
  const [weekEditorOpen, setWeekEditorOpen] = useState(false);
  const [weekEditorRoutineId, setWeekEditorRoutineId] = useState<number | null>(null);

  // Alumnos asignados (solo edit-own)
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [planningStudents, setPlanningStudents] = useState<Array<{
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url: string | null;
    active_planning_current_week?: number | null;
  }>>([]);

  // ─── React Hook Form ──────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialSeed?.title ?? "",
      description: initialSeed?.description ?? "",
      total_weeks: 4,
      days_per_week: 4,
    },
  });

  // ─── Carga inicial ────────────────────────────────────────────────────────

  useEffect(() => {
    if (mode === "create-own") {
      setLoading(false);
      return;
    }

    if (!planningId) {
      setLoadError("ID de planificación no especificado.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        let p: Planning;
        if (mode === "edit-coach" && studentId) {
          p = await getStudentPlanning(studentId, planningId);
        } else {
          p = await getPlanning(planningId);
        }

        setPlanning(p);
        reset({
          title: p.title,
          description: "",
          total_weeks: p.total_weeks,
          days_per_week: p.target_days?.length ?? 4,
        });

        const week = calcCurrentWeek(p);
        setCurrentWeek(week);
        setViewWeek(week);
        setAssignments(buildAssignments(p, p.total_weeks));
        setRoutinesById(buildRoutinesById(p));

        // Authorship
        if (mode === "edit-coach" && user && p.created_by !== user.id) {
          setIsReadOnly(true);
        }
      } catch (err) {
        setLoadError(getErrorMessage(err, "No se pudo cargar la planificación."));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mode, planningId, studentId, user, reset]);

  // Poblar alumnos asignados desde planningShares (solo edit-own)
  useEffect(() => {
    if (mode !== "edit-own" || !planning) return;

    // Usar los planningShares activos que vienen en la planning
    const shares = (planning.planningShares ?? []).filter((s) => s.status === "active");
    const fromShares = shares.map((s) => ({
      id: s.sharedWith?.id ?? 0,
      username: s.sharedWith?.username ?? "Alumno",
      first_name: null as string | null,
      last_name: null as string | null,
      avatar_url: s.sharedWith?.avatar_url ?? null,
    }));
    setPlanningStudents(fromShares);
    setStudentsLoading(false);
  }, [mode, planning]);

  // ─── Handlers del grid ───────────────────────────────────────────────────

  const handleCellClick = useCallback((week: number, dayIndex: number) => {
    setSelectorWeek(week);
    setSelectorDayIndex(dayIndex);
    setSelectorOpen(true);
  }, []);

  const handleRoutineSelect = useCallback(
    (routineId: number | null) => {
      const key: CellKey = `${selectorWeek}-${selectorDayIndex}`;
      setAssignments((prev) => ({ ...prev, [key]: routineId }));
    },
    [selectorWeek, selectorDayIndex]
  );

  // ─── Submit (guardar) ─────────────────────────────────────────────────────

  const onSubmit = handleSubmit(async (values) => {
    if (isReadOnly) {
      setSaveError("No tenés permiso para editar esta planificación.");
      return;
    }

    setSaveError(null);
    setSaving(true);

    try {
      // Calcular target_days a partir del grid (días que tienen al menos 1 rutina en semana 1)
      const activeDayIndices = new Set<number>();
      const totalWeeks = values.total_weeks;
      for (let d = 0; d < 7; d++) {
        for (let w = 1; w <= totalWeeks; w++) {
          if (assignments[`${w}-${d}`] != null) {
            activeDayIndices.add(d);
            break;
          }
        }
      }
      const target_days: DayOfWeek[] = ALL_DAYS
        .filter((d) => activeDayIndices.has(d.dayIndex))
        .map((d) => d.dow);

      const payload: Partial<Planning> = {
        title: values.title.trim(),
        total_weeks: values.total_weeks,
        target_days: target_days.length > 0 ? target_days : null,
      };

      if (mode === "create-own") {
        payload.status = "draft";
        const created = await createPlanning(payload);
        setSavedSuccess(true);
        setTimeout(() => router.push(`/plannings/${created.id}`), 800);
      } else if (mode === "edit-own" && planningId) {
        const updated = await updatePlanning(planningId, payload);
        setPlanning(updated);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      } else if (mode === "edit-coach" && planningId && studentId) {
        const updated = await updateStudentPlanning(studentId, planningId, payload);
        setPlanning(updated);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo guardar la planificación."));
    } finally {
      setSaving(false);
    }
  });

  // ─── Activar/Desactivar ───────────────────────────────────────────────────

  const handleStatusUpdate = async (payload: {
    status: Planning["status"];
    start_date?: string;
  }) => {
    if (!planningId) return;

    let updated: Planning;
    if (mode === "edit-coach" && studentId) {
      updated = await updateStudentPlanning(studentId, planningId, payload);
    } else {
      updated = await updatePlanning(planningId, payload);
    }
    setPlanning(updated);
  };

  // ─── Eliminar ─────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!planningId) return;
    setDeleting(true);
    try {
      await deletePlanning(planningId);
      router.push("/plannings");
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo eliminar la planificación."));
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-xxl">
        <SkeletonBox height={60} />
        <SkeletonBox height={80} />
        <SkeletonBox height={400} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-lg">
        <ErrorBanner message={loadError} />
        <Link href={mode === "edit-coach" && studentId ? `/students/${studentId}` : "/plannings"}>
          <Button variant="outline" size="md">
            Volver
          </Button>
        </Link>
      </div>
    );
  }

  if (mode !== "create-own" && !planning && !loading) {
    return (
      <div className="flex flex-col gap-lg items-start">
        <p className="text-base text-fg-secondary m-0">Esta planificación no existe o fue eliminada.</p>
        <Link href="/plannings">
          <Button variant="outline" size="md">
            Volver a planificaciones
          </Button>
        </Link>
      </div>
    );
  }

  const totalWeeks = planning?.total_weeks ?? 4;
  const canActivate =
    planning &&
    planning.status !== "completed" &&
    planning.status !== "archived";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Banner read-only */}
      {isReadOnly && (
        <div
          className="flex items-center gap-sm p-md rounded-md mb-xl"
          style={{
            background: "var(--warning-alpha-20)",
            border: "1px solid var(--warning-alpha-40)",
            color: "var(--warning)",
          }}
        >
          <Lock size={16} className="flex-shrink-0" />
          <span className="text-sm font-medium">
            Esta planificación fue creada por el alumno o por otro coach. Solo podés verla.
          </span>
        </div>
      )}

      <div className="flex gap-xxl" style={{ alignItems: "flex-start" }}>
        {/* ─── Columna principal ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-lg flex-1 min-w-0">

          {/* Header */}
          <div className="flex flex-col gap-sm">
            <div className="flex items-start gap-lg flex-wrap">
              <div className="flex flex-col gap-xs flex-1 min-w-0">
                {/* Nombre inline */}
                <input
                  {...register("title")}
                  disabled={isReadOnly}
                  placeholder="Nombre de la planificación..."
                  className={[
                    "w-full bg-transparent text-fg placeholder-fg-tertiary outline-none transition-colors",
                    "text-display font-bold border-b-2",
                    errors.title
                      ? "border-destructive"
                      : "border-transparent focus:border-primary",
                    isReadOnly ? "cursor-default" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ lineHeight: 1.2, padding: "2px 0" }}
                />
                {errors.title && (
                  <p className="text-xxs text-destructive m-0">{errors.title.message}</p>
                )}

                {/* Sub-header info */}
                {planning && (
                  <div className="flex items-center gap-sm flex-wrap mt-xs">
                    <PlanningStatusBadge status={planning.status} />
                    <span className="text-sm text-fg-secondary">
                      {totalWeeks} semanas · {planning.target_days?.length ?? 0} días/sem
                    </span>
                    {planning.start_date && (
                      <span className="text-sm text-fg-tertiary">
                        Inicio: {formatDate(planning.start_date)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-sm flex-shrink-0 flex-wrap">
                {!isReadOnly && planning && canActivate && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowActivateModal(true)}
                  >
                    {planning.status === "active" ? "Desactivar" : planning.status === "scheduled" ? "Cancelar programación" : "Activar"}
                  </Button>
                )}
                {!isReadOnly && mode === "edit-own" && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    iconLeft={<Trash2 size={14} />}
                  >
                    Eliminar
                  </Button>
                )}
                {!isReadOnly && (
                  <Button
                    type="submit"
                    variant={savedSuccess ? "success" : "primary"}
                    size="sm"
                    loading={saving}
                    iconLeft={<Save size={14} />}
                  >
                    {savedSuccess ? "¡Guardado!" : "Guardar"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Error banner */}
          {saveError && <ErrorBanner message={saveError} dismissible />}

          {/* Config card (solo create-own) */}
          {mode === "create-own" && (
            <Card>
              <h3 className="text-base font-semibold text-fg m-0 mb-lg">
                Configuración del ciclo
              </h3>
              <div className="flex gap-lg flex-wrap">
                <div className="flex flex-col gap-xs flex-1 min-w-0" style={{ minWidth: 120 }}>
                  <label className="text-sm font-medium text-fg-secondary">Semanas</label>
                  <input
                    type="number"
                    {...register("total_weeks", { valueAsNumber: true })}
                    min={1}
                    max={52}
                    className={[
                      "h-11 bg-fill-tertiary text-fg rounded-md text-base outline-none px-md",
                      "border transition-colors",
                      errors.total_weeks ? "border-destructive" : "border-transparent focus:border-primary",
                    ].join(" ")}
                  />
                  {errors.total_weeks && (
                    <p className="text-xxs text-destructive m-0">{errors.total_weeks.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-xs flex-1 min-w-0" style={{ minWidth: 120 }}>
                  <label className="text-sm font-medium text-fg-secondary">Días por semana</label>
                  <input
                    type="number"
                    {...register("days_per_week", { valueAsNumber: true })}
                    min={1}
                    max={7}
                    className={[
                      "h-11 bg-fill-tertiary text-fg rounded-md text-base outline-none px-md",
                      "border transition-colors",
                      errors.days_per_week ? "border-destructive" : "border-transparent focus:border-primary",
                    ].join(" ")}
                  />
                  {errors.days_per_week && (
                    <p className="text-xxs text-destructive m-0">{errors.days_per_week.message}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Selector de semana */}
          {planning && (
            <WeekSelector
              currentWeek={viewWeek}
              totalWeeks={totalWeeks}
              actualCurrentWeek={currentWeek}
              readOnly={isReadOnly}
              onPrev={() => setViewWeek((w) => Math.max(1, w - 1))}
              onNext={() => setViewWeek((w) => Math.min(totalWeeks, w + 1))}
            />
          )}

          {/* Grid */}
          {planning ? (
            <PlanningGrid
              totalWeeks={totalWeeks}
              assignments={assignments}
              routinesById={routinesById}
              currentWeek={currentWeek}
              selectedWeek={viewWeek}
              readOnly={isReadOnly}
              onCellClick={handleCellClick}
              onSelectWeek={setViewWeek}
            />
          ) : mode === "create-own" ? (
            <div
              className="rounded-lg p-xxl flex flex-col items-center gap-md text-center"
              style={{
                background: "var(--fill-tertiary)",
                border: "1.5px dashed var(--separator)",
              }}
            >
              <p className="text-base text-fg-secondary m-0">
                Guardá la planificación para empezar a asignar rutinas al grid.
              </p>
            </div>
          ) : null}
        </div>

        {/* ─── Side panel ────────────────────────────────────────────────── */}
        <aside
          className="flex flex-col gap-lg flex-shrink-0"
          style={{ width: "300px" }}
        >
          {/* Card: Ejercicios del día seleccionado */}
          {planning && (() => {
            const todayRoutineId = assignments[`${viewWeek}-0`]; // Lunes por default
            const todayRoutine = todayRoutineId != null ? routinesById[todayRoutineId] : null;

            return (
              <Card>
                <div className="flex items-center justify-between gap-sm mb-md">
                  <h3 className="text-base font-semibold text-fg m-0">
                    {getDayLabel(0)} · Semana {viewWeek}
                  </h3>
                  {!isReadOnly && todayRoutine && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline flex items-center gap-xs"
                      onClick={() => {
                        setWeekEditorRoutineId(todayRoutine.id);
                        setWeekEditorOpen(true);
                      }}
                    >
                      <Pencil size={12} />
                      Editar
                    </button>
                  )}
                </div>

                {!todayRoutine ? (
                  <p className="text-sm text-fg-tertiary m-0">Descanso</p>
                ) : (
                  <div className="flex flex-col gap-sm">
                    <p className="text-sm font-semibold text-fg m-0">{todayRoutine.title}</p>
                    <div className="flex flex-col gap-xs">
                      {(todayRoutine.exercises ?? []).slice(0, 5).map((ex) => (
                        <div key={ex.id} className="flex flex-col">
                          <p className="text-sm text-fg m-0 truncate">{ex.name}</p>
                          <p className="text-xs text-fg-secondary m-0">
                            {ex.series} series
                            {ex.sets_data && ex.sets_data[0]?.reps ? ` · ${ex.sets_data[0].reps}` : ""}
                            {ex.sets_data && ex.sets_data[0]?.reps && ex.sets_data[ex.sets_data.length - 1]?.reps !== ex.sets_data[0]?.reps
                              ? `-${ex.sets_data[ex.sets_data.length - 1]?.reps} reps`
                              : ex.sets_data?.[0]?.reps
                              ? " reps"
                              : ""}
                          </p>
                        </div>
                      ))}
                      {(todayRoutine.exercises ?? []).length > 5 && (
                        <p className="text-xs text-fg-tertiary m-0">
                          +{(todayRoutine.exercises ?? []).length - 5} más...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })()}

          {/* Card: Alumnos asignados (solo edit-own) */}
          {mode === "edit-own" && (
            <Card>
              <h3 className="text-base font-semibold text-fg m-0 mb-md">
                Alumnos asignados
              </h3>

              {studentsLoading ? (
                <div className="flex flex-col gap-sm mb-md">
                  <SkeletonLine height={32} />
                  <SkeletonLine height={32} />
                </div>
              ) : planningStudents.length === 0 ? (
                <p className="text-sm text-fg-tertiary m-0 mb-md">
                  Ningún alumno tiene esta planning activa.
                </p>
              ) : (
                <div className="flex flex-col gap-sm mb-md">
                  {planningStudents.map((s) => (
                    <div key={s.id} className="flex items-center gap-sm">
                      <Avatar
                        src={s.avatar_url}
                        initials={
                          s.first_name
                            ? `${s.first_name[0]}${s.last_name?.[0] ?? ""}`.toUpperCase()
                            : s.username.slice(0, 2).toUpperCase()
                        }
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-fg m-0 truncate">
                          {s.first_name ? `${s.first_name} ${s.last_name ?? ""}`.trim() : s.username}
                        </p>
                        {s.active_planning_current_week && (
                          <p className="text-xs text-fg-secondary m-0">
                            Semana {s.active_planning_current_week}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TODO: Botón "Asignar a más alumnos" — requiere endpoint específico
                  POST /api/plannings/:id/shares (disponible en el backend pero no implementado
                  en la Wave 3 del web). */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled
                title="Próximamente"
                iconLeft={<Plus size={14} />}
              >
                Asignar a más alumnos
              </Button>
              <p className="text-xs text-fg-tertiary m-0 mt-xs text-center">
                Disponible próximamente
              </p>
            </Card>
          )}

          {/* Detalles */}
          {planning && (
            <Card>
              <h3 className="text-base font-semibold text-fg m-0 mb-md">Detalles</h3>
              <dl className="m-0 flex flex-col gap-sm">
                <DetailRow label="Creada" value={planning.created_at ? formatDate(planning.created_at) : "—"} />
                <DetailRow label="Última edición" value={planning.updated_at ? formatDate(planning.updated_at) : "—"} />
                <DetailRow label="Total semanas" value={String(planning.total_weeks)} />
                {planning.current_week && (
                  <DetailRow label="Semana actual" value={`${planning.current_week} / ${planning.total_weeks}`} />
                )}
              </dl>
            </Card>
          )}
        </aside>
      </div>

      {/* Modals */}
      <RoutineSelectorModal
        open={selectorOpen}
        selectedRoutineId={assignments[`${selectorWeek}-${selectorDayIndex}`] ?? null}
        onSelect={handleRoutineSelect}
        onClose={() => setSelectorOpen(false)}
        week={selectorWeek}
        dayLabel={getDayLabel(selectorDayIndex)}
      />

      {weekEditorRoutineId != null && planning && (
        <WeekExercisesEditor
          open={weekEditorOpen}
          onClose={() => setWeekEditorOpen(false)}
          planningId={planning.id}
          routineId={weekEditorRoutineId}
          routineTitle={routinesById[weekEditorRoutineId]?.title ?? "Rutina"}
          week={viewWeek}
          dayLabel={getDayLabel(0)}
          mode={mode === "edit-coach" ? "coach" : "own"}
          studentId={studentId}
          readOnly={isReadOnly}
        />
      )}

      {planning && (
        <ActivateDeactivateModal
          open={showActivateModal}
          planning={planning}
          onClose={() => setShowActivateModal(false)}
          onUpdate={handleStatusUpdate}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Eliminar planificación"
        description={`¿Seguro que querés eliminar "${planning?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </form>
  );
};

// ─── Sub-componente ───────────────────────────────────────────────────────────

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-md text-sm">
    <dt className="text-fg-secondary m-0">{label}</dt>
    <dd className="text-fg m-0 font-medium text-right">{value}</dd>
  </div>
);
