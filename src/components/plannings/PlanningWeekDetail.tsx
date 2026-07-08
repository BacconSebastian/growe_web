"use client";

/**
 * PlanningWeekDetail.tsx
 *
 * Editor de UNA semana: calendario semanal estilo StudentWeeklyProgress con
 * celdas clickeables (grid-cols-7). Máximo 1 rutina por día.
 *
 * Click en celda VACÍA → crea una rutina "draft" (en memoria, sin persistir) y
 * la muestra inline debajo del calendario vía WeekRoutineExercisesEditor. En el
 * input de nombre del draft el usuario puede buscar una rutina existente (se
 * copia su contenido) o escribir un nombre nuevo — al Guardar se crea la rutina
 * real (ver DRAFT_WK_RT_ID / handleStartDraftForDay / handleSaveRoutine).
 * Click en celda CON rutina → panel inline con WeekRoutineExercisesEditor + "Eliminar".
 *
 * Rutinas sin día: pills debajo del calendario, clickeables para editar.
 *
 * REGLA CRÍTICA: el payload SIEMPRE incluye TODAS las rutinas de la semana,
 * incluidas las read-only (created_by !== currentUserId), o el backend las borra implícitamente.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ClipboardPaste, Trash2, Loader2 } from "lucide-react";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { getErrorMessage } from "@/lib/utils";

import { WeekRoutineExercisesEditor } from "./WeekRoutineExercisesEditor";
import { RoutineDayCard, IconButton } from "./RoutineDayCard";
import { pasteRoutineIntoWeek } from "@/lib/planning-week-paste";

import {
  saveWeekRoutines,
  removeRoutineFromWeek,
  type SaveWeekRoutineInput,
} from "@/lib/api/plannings";
import {
  coachRemoveRoutineFromWeek,
  coachSaveWeekRoutines,
  createAndAssignStudentRoutine,
} from "@/lib/api/coaching";

import type { PlanningWeek, PlanningWeekRoutine, PlanningWeekRoutineExercise, DayOfWeek } from "@/lib/api/types";
import type { RoutineClipboard } from "@/components/plannings/PlanningOverview";

/** ID temporal usado por la rutina "draft" (no persistida) mostrada inline al
 * tocar un día vacío del calendario. Nunca colisiona con un id real (siempre > 0). */
const DRAFT_WK_RT_ID = -1;

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
  const [actionError, setActionError] = useState<string | null>(null);

  // Rutina seleccionada → se muestra inline debajo del calendario (no modal)
  const [selectedWkRtId, setSelectedWkRtId] = useState<number | null>(null);

  // Rutina "draft" (no persistida) mostrada inline al tocar un día vacío del
  // calendario. Se reemplaza al iniciar un draft para otro día, y se descarta
  // al guardar (se crea la rutina real) o al quitarla explícitamente.
  const [draftRoutine, setDraftRoutine] = useState<PlanningWeekRoutine | null>(null);
  // Identificador de instancia único del draft actual (distinto en cada draft nuevo,
  // aunque el draft siempre use id=DRAFT_WK_RT_ID). Se usa como `key` del editor para
  // forzar el remount y evitar que el título/bloques de un draft anterior queden
  // "pegados" al abrir un draft nuevo (ambos comparten id=-1 y title inicial="").
  const [draftNonce, setDraftNonce] = useState<string | null>(null);

  // Al cambiar de semana (navegación ◀▶), descartar cualquier draft en memoria:
  // de lo contrario un draft sin guardar de la Semana 1 sobrevive y aparece
  // pintado en el mismo día de la Semana 2 (la semana es otro objeto, el draft
  // vive en estado local ajeno a `week.routines`).
  useEffect(() => {
    setDraftRoutine(null);
    setDraftNonce(null);
    setSelectedWkRtId(null);
  }, [week.id]);

  // Celda que está pegando ahora (para overlay de carga). Key: wkRt-<id> | day-<dow>.
  const [pastingKey, setPastingKey] = useState<string | null>(null);

  // Rutina pendiente de quitar de la semana (confirmación) + loading.
  const [removeTarget, setRemoveTarget] = useState<PlanningWeekRoutine | null>(null);
  const [removing, setRemoving] = useState(false);

  // Pegado pendiente de confirmación.
  const [pastePending, setPastePending] = useState<{
    key: string;
    targetWkRt: PlanningWeekRoutine | null;
    targetDay: DayOfWeek | null;
  } | null>(null);

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

  // La rutina seleccionada se deriva de week.routines (siempre fresca tras editar/quitar),
  // salvo cuando el seleccionado es el draft en memoria (no persistido todavía).
  const selectedWkRt = useMemo(() => {
    if (selectedWkRtId === DRAFT_WK_RT_ID) return draftRoutine;
    return week.routines.find((r) => r.id === selectedWkRtId) ?? null;
  }, [week.routines, selectedWkRtId, draftRoutine]);

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

  // Selecciona/deselecciona la rutina de un día (toggle) → panel inline abajo
  const handleSelectDayRoutine = (wr: PlanningWeekRoutine) => {
    setSelectedWkRtId((prev) => (prev === wr.id ? null : wr.id));
  };

  /**
   * Inicia una rutina "draft" para un día vacío: se muestra inline debajo del
   * calendario (WeekRoutineExercisesEditor con enableNameSearch) sin pegarle
   * a la API todavía. El usuario puede buscar una rutina existente en el input
   * de nombre (se copia su contenido) o escribir un nombre nuevo y Guardar
   * para crear la rutina vacía. Reemplaza cualquier draft anterior.
   */
  const handleStartDraftForDay = useCallback(
    (day: DayOfWeek) => {
      const maxOrderIndex = week.routines.reduce((max, r) => Math.max(max, r.order_index ?? -1), -1);
      const draft: PlanningWeekRoutine = {
        id: DRAFT_WK_RT_ID,
        routine_id: 0,
        routine_title: "",
        day_of_week: day,
        routine_day_of_week: null,
        order_index: maxOrderIndex + 1,
        created_by: currentUserId,
        exercises: [],
      };
      setDraftRoutine(draft);
      setDraftNonce(crypto.randomUUID());
      setSelectedWkRtId(DRAFT_WK_RT_ID);
    },
    [week.routines, currentUserId],
  );

  /**
   * Actualiza en vivo el `routine_title` del draft en memoria a medida que el
   * usuario escribe/copia un nombre en el editor, para que la card del día
   * refleje el nombre real en vez de quedar fija en "Nueva rutina". Solo aplica
   * al draft (WeekRoutineExercisesEditor solo dispara este callback cuando
   * enableNameSearch está activo, es decir, únicamente para el draft).
   */
  const handleDraftTitleChange = useCallback((newTitle: string) => {
    setDraftRoutine((prev) => (prev ? { ...prev, routine_title: newTitle } : prev));
  }, []);

  // Quitar rutina de la semana (o descartar el draft en memoria, sin API).
  const handleRemoveRoutine = async (wkRtId: number) => {
    if (wkRtId === DRAFT_WK_RT_ID) {
      setDraftRoutine(null);
      setDraftNonce(null);
      setSelectedWkRtId(null);
      return;
    }
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
    // Guardar el draft: crea la rutina nueva (con nombre libre o hidratada por
    // búsqueda) y la asigna a la semana. own → saveWeekRoutines con TODAS las
    // rutinas existentes + la entrada nueva. coach → endpoint atómico.
    if (wkRtId === DRAFT_WK_RT_ID) {
      if (!draftRoutine) return;
      if (mode === "coach" && studentId != null) {
        const newWkRt = await createAndAssignStudentRoutine(studentId, week.id, {
          title,
          day_of_week: draftRoutine.day_of_week ?? undefined,
          exercises,
        });
        onWeekUpdated({ ...week, routines: [...week.routines, newWkRt] });
      } else {
        const existingRoutineInputs: SaveWeekRoutineInput[] = week.routines.map((r) => ({
          week_routine_id: r.id,
          routine_id: r.routine_id,
          title: r.routine_title,
          day_of_week: effectiveDay(r),
          order_index: r.order_index,
          exercises: mapRoutineExercisesToInput(r.exercises),
        }));
        const newRoutineInput: SaveWeekRoutineInput = {
          week_routine_id: null,
          routine_id: null,
          title,
          day_of_week: draftRoutine.day_of_week ?? undefined,
          exercises,
        };
        const updatedWeek = await saveWeekRoutines(week.id, [...existingRoutineInputs, newRoutineInput]);
        onWeekUpdated(updatedWeek);
      }
      setDraftRoutine(null);
      setDraftNonce(null);
      setSelectedWkRtId(null);
      return;
    }

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

  // Wrapper que marca la celda destino como "pegando" para el overlay de carga.
  const pasteWithLoading = useCallback(
    async (key: string, targetWkRt: PlanningWeekRoutine | null, targetDay: DayOfWeek | null) => {
      setPastingKey(key);
      try {
        await handlePasteRoutine(targetWkRt, targetDay);
      } finally {
        setPastingKey(null);
      }
    },
    [handlePasteRoutine],
  );

  // Confirmar pegado (puede reemplazar ejercicios existentes).
  const confirmPaste = useCallback(async () => {
    if (!pastePending) return;
    const { key, targetWkRt, targetDay } = pastePending;
    setPastePending(null);
    await pasteWithLoading(key, targetWkRt, targetDay);
  }, [pastePending, pasteWithLoading]);

  // Confirmar quitar rutina de la semana (le saca el día; no borra el template).
  const confirmRemove = useCallback(async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await handleRemoveRoutine(removeTarget.id);
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  }, [removeTarget, handleRemoveRoutine]);

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
              // Draft activo para este día: solo aplica si el día no tiene rutina real
              // asignada (un día con rutina real nunca dispara/mantiene un draft).
              const isDraftDay = !wr && draftRoutine !== null && draftRoutine.day_of_week === dow;

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
                      loading={pastingKey === `wkRt-${wr.id}`}
                      metaAlwaysVisible={routineClipboard?.sourceId === wr.id}
                      onClick={() => handleSelectDayRoutine(wr)}
                      titleAttr={`${wr.routine_title}${canEditCell ? " · click para editar" : " · click para ver"}`}
                      metaOverlay={
                        <>
                          {/* Copiar / descopiar (toggle) */}
                          <IconButton
                            title={
                              routineClipboard?.sourceId === wr.id
                                ? "Copiado — click para descopiar"
                                : "Copiar contenido del día"
                            }
                            active={routineClipboard?.sourceId === wr.id}
                            disabled={!onCopyRoutine}
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopyRoutine?.(wr);
                            }}
                          >
                            <Copy size={13} />
                          </IconButton>
                          {/* Pegar — disabled si no hay clipboard o no se puede editar */}
                          <IconButton
                            title={
                              routineClipboard
                                ? `Pegar "${routineClipboard.title}" acá`
                                : "No hay rutina copiada"
                            }
                            disabled={!routineClipboard || !canEditCell}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPastePending({
                                key: `wkRt-${wr.id}`,
                                targetWkRt: wr,
                                targetDay: effectiveDay(wr),
                              });
                            }}
                          >
                            <ClipboardPaste size={13} />
                          </IconButton>
                          {/* Quitar rutina del día (no borra el template) */}
                          <IconButton
                            title="Quitar rutina de este día"
                            destructive
                            disabled={!canEditCell}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRemoveTarget(wr);
                            }}
                          >
                            <Trash2 size={13} />
                          </IconButton>
                        </>
                      }
                    />
                  ) : isDraftDay ? (
                    /* Celda con rutina "draft" (nueva, aún no guardada) */
                    <RoutineDayCard
                      title={draftRoutine!.routine_title.trim() || "Nueva rutina"}
                      exercises={0}
                      sets={0}
                      selected={selectedWkRtId === DRAFT_WK_RT_ID}
                      onClick={() => setSelectedWkRtId(DRAFT_WK_RT_ID)}
                      titleAttr="Rutina nueva (sin guardar) · click para editar"
                      metaOverlay={
                        <>
                          <IconButton title="No hay rutina para copiar" disabled onClick={(e) => e.stopPropagation()}>
                            <Copy size={13} />
                          </IconButton>
                          <IconButton
                            title="No hay rutina copiada"
                            disabled
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ClipboardPaste size={13} />
                          </IconButton>
                          {/* Descartar el draft — no llama a la API */}
                          <IconButton
                            title="Descartar rutina nueva"
                            destructive
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveRoutine(DRAFT_WK_RT_ID);
                            }}
                          >
                            <Trash2 size={13} />
                          </IconButton>
                        </>
                      }
                    />
                  ) : (
                    /* Celda vacía */
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleStartDraftForDay(dow)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleStartDraftForDay(dow);
                        }
                      }}
                      className="group relative w-full flex flex-col items-center justify-center gap-xs rounded-lg px-xs py-md text-center cursor-pointer transition-colors hover:bg-fill-tertiary"
                      style={{
                        minHeight: "84px",
                        background: "transparent",
                        border: "1px dashed var(--separator)",
                      }}
                      title="Asignar rutina a este día"
                    >
                      <span className="text-xl font-bold leading-none" style={{ color: "var(--fg-tertiary)" }}>
                        +
                      </span>
                      {/* Misma zona/botones que las cards con rutina (copiar/eliminar disabled) */}
                      <div className="relative w-full mt-sm">
                        <span className="block text-xxs leading-tight opacity-0" aria-hidden>
                          &nbsp;
                        </span>
                        <div className="absolute inset-0 flex items-center justify-center gap-xs opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto">
                          <IconButton title="No hay rutina para copiar" disabled onClick={(e) => e.stopPropagation()}>
                            <Copy size={13} />
                          </IconButton>
                          <IconButton
                            title={
                              routineClipboard
                                ? `Pegar "${routineClipboard.title}" acá`
                                : "No hay rutina copiada"
                            }
                            disabled={!routineClipboard}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPastePending({ key: `day-${dow}`, targetWkRt: null, targetDay: dow });
                            }}
                          >
                            <ClipboardPaste size={13} />
                          </IconButton>
                          <IconButton title="No hay rutina para quitar" destructive disabled onClick={(e) => e.stopPropagation()}>
                            <Trash2 size={13} />
                          </IconButton>
                        </div>
                      </div>
                      {pastingKey === `day-${dow}` && (
                        <div
                          className="absolute inset-0 flex items-center justify-center rounded-lg"
                          style={{ background: "var(--overlay-medium)" }}
                        >
                          <Loader2 className="animate-spin" size={20} style={{ color: "var(--fg)" }} />
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
                    {/* Copiar / descopiar pill (toggle) */}
                    <IconButton
                      title={
                        routineClipboard?.sourceId === wr.id
                          ? "Copiado — click para descopiar"
                          : "Copiar contenido de esta rutina"
                      }
                      active={routineClipboard?.sourceId === wr.id}
                      disabled={!onCopyRoutine}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyRoutine?.(wr);
                      }}
                    >
                      <Copy size={13} />
                    </IconButton>
                    {/* Pegar en pill — disabled si no hay clipboard o no se puede editar */}
                    {pastingKey === `wkRt-${wr.id}` ? (
                      <Loader2 className="animate-spin" size={16} style={{ color: "var(--fg-tertiary)" }} />
                    ) : (
                      <IconButton
                        title={
                          routineClipboard ? `Pegar "${routineClipboard.title}" acá` : "No hay rutina copiada"
                        }
                        disabled={!routineClipboard || !canEditPill}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPastePending({ key: `wkRt-${wr.id}`, targetWkRt: wr, targetDay: null });
                        }}
                      >
                        <ClipboardPaste size={13} />
                      </IconButton>
                    )}
                    {/* Quitar de la semana (no borra el template) */}
                    <IconButton
                      title="Quitar rutina de la semana"
                      destructive
                      disabled={!canEditPill}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemoveTarget(wr);
                      }}
                    >
                      <Trash2 size={13} />
                    </IconButton>
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
          // Las rutinas reales usan su id como key. El draft SIEMPRE tiene
          // id=DRAFT_WK_RT_ID, así que usamos el nonce de instancia para forzar
          // el remount al abrir un draft nuevo — si no, el título/bloques del
          // draft anterior (misma key) quedarían "pegados" al nuevo.
          key={selectedWkRt.id === DRAFT_WK_RT_ID ? `draft-${draftNonce}` : selectedWkRt.id}
          weekRoutine={selectedWkRt}
          readOnly={!(mode === "own" || (mode === "coach" && selectedWkRt.created_by === currentUserId))}
          mode={mode}
          studentId={studentId}
          prevExercises={prevExercisesForSelected ?? undefined}
          onSave={handleSaveRoutine}
          onDelete={handleRemoveRoutine}
          enableNameSearch={selectedWkRt.id === DRAFT_WK_RT_ID}
          onTitleChange={selectedWkRt.id === DRAFT_WK_RT_ID ? handleDraftTitleChange : undefined}
        />
      )}

      <ConfirmDialog
        open={pastePending !== null}
        title="Pegar rutina"
        description={
          !pastePending || !routineClipboard
            ? ""
            : pastePending.targetWkRt
              ? `¿Pegar "${routineClipboard.title}" en "${pastePending.targetWkRt.routine_title}"? Se reemplazarán los ejercicios actuales de ese día.`
              : `¿Pegar "${routineClipboard.title}" en este día?`
        }
        confirmLabel="Pegar"
        confirmVariant="primary"
        onConfirm={confirmPaste}
        onClose={() => setPastePending(null)}
      />
      <ConfirmDialog
        open={removeTarget !== null}
        title="Quitar rutina"
        description={
          removeTarget
            ? `¿Quitar "${removeTarget.routine_title}" de esta semana? La rutina no se elimina, solo se le saca el día asignado.`
            : ""
        }
        confirmLabel="Quitar"
        confirmVariant="danger"
        loading={removing}
        onConfirm={confirmRemove}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  );
};
