"use client";

/**
 * PlanningOverview.tsx
 *
 * Vista de la planning completa. Arquitectura de dos niveles:
 *
 * NIVEL 1 — Overview: lista de WeekCards colapsables (GradientSurface).
 *   Al expandir → WeekCalendarReadonly (solo lectura, grid-cols-7).
 *   Botón dashed "Agregar semana" al pie de la lista.
 *
 * NIVEL 2 — Editar semana (selectedWeek != null):
 *   Breadcrumb ← {planning.title} / Semana N.
 *   Fila de navegación: WeekOrderBadge + ◀ + "Semana N de M · nombre" + badge "Actual" + ▶.
 *   Las flechas navegan entre semanas sin volver al overview.
 *   Botón "Editar nombre" → EditWeekModal.
 *   Cuerpo: PlanningWeekDetail (calendario editable).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Clipboard,
  ClipboardPaste,
  Pencil,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonBox } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

import { PlanningStatusBadge } from "./PlanningStatusBadge";
import { PlanningWeekDetail } from "./PlanningWeekDetail";
import { RoutineDayCard, IconButton as CardIconButton } from "./RoutineDayCard";
import { pasteRoutineIntoWeek } from "@/lib/planning-week-paste";

import {
  getPlanning,
  addWeek,
  updateWeek,
  deleteWeek,
  reorderWeeks,
  copyWeekRoutines,
  setCurrentWeekOverride,
  updatePlanning,
  type AddWeekPayload,
  type UpdateWeekPayload,
} from "@/lib/api/plannings";
import {
  getStudentPlanning,
  coachAddWeek,
  coachUpdateWeek,
  coachDeleteWeek,
  coachReorderWeeks,
  coachCopyWeekRoutines,
  appendWeekFromCopy,
  setStudentPlanningCurrentWeek,
  updateStudentPlanning,
  duplicateStudentPlanningToLibrary,
} from "@/lib/api/coaching";
import { BulkAssignPlanningModal } from "@/components/coaching/BulkAssignPlanningModal";

import type { Planning, PlanningWeek, PlanningWeekRoutine, PlanningWeekRoutineExercise, DayOfWeek } from "@/lib/api/types";
import { remapSupersetGroupsRaw } from "@/lib/superset-edit";

// ─── Constantes de calendario (espejo de StudentWeeklyProgress) ───────────────

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const WEEK_CARD_COLLAPSED_MIN_HEIGHT = 64; // px — altura mínima del botón dashed
const WEEKS_PER_PAGE = 4; // semanas por página en el overview

// ─── Helpers ──────────────────────────────────────────────────────────────────

function effectiveDay(wr: PlanningWeekRoutine): DayOfWeek | null {
  if (wr.day_of_week) return wr.day_of_week as DayOfWeek;
  if (wr.routine_day_of_week && wr.routine_day_of_week.length > 0)
    return wr.routine_day_of_week[0] as DayOfWeek;
  return null;
}

/** Cuenta ejercicios y series totales de una rutina de semana. */
function routineCounts(wr: PlanningWeekRoutine): { exercises: number; sets: number } {
  const exercises = wr.exercises?.length ?? 0;
  const sets = (wr.exercises ?? []).reduce(
    (acc, ex) => acc + (ex.sets_data?.length ?? ex.series ?? 0),
    0
  );
  return { exercises, sets };
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Segmento padre del breadcrumb que provee la página (con su link). */
export interface BreadcrumbCrumb {
  label: string;
  href: string;
}

export interface PlanningOverviewProps {
  mode: "own" | "coach";
  studentId?: number;
  planningId: number;
  /**
   * Crumbs PADRE del breadcrumb (con link), antes del nivel de la planning.
   * own → [Planificaciones]; coach → [Alumnos, {alumno}].
   * PlanningOverview agrega el nombre de la planning y, en el drill-in, "Semana N".
   */
  trail: BreadcrumbCrumb[];
}

// ─── PlanningBreadcrumb — breadcrumb único (estilo página) ────────────────────

const PlanningBreadcrumb: React.FC<{
  /** Crumbs padre (links). */
  parents: BreadcrumbCrumb[];
  /** Nombre de la planning (segmento de la planning). Ausente mientras carga. */
  planningLabel?: string;
  /** Si está presente, estamos en el drill-in: se agrega como segmento final. */
  weekLabel?: string;
  /** Click en el segmento de la planning (vuelve al overview). */
  onPlanningClick?: () => void;
}> = ({ parents, planningLabel, weekLabel, onPlanningClick }) => {
  const drillIn = Boolean(weekLabel);

  return (
    <nav className="flex items-center gap-xs text-sm flex-wrap">
      <ChevronLeft size={14} className="flex-shrink-0" style={{ color: "var(--fg-tertiary)" }} />

      {parents.map((c, i) => (
        <React.Fragment key={`${c.label}-${i}`}>
          {i > 0 && <span style={{ color: "var(--fg-tertiary)" }}>/</span>}
          <Link
            href={c.href}
            className="transition-colors hover:text-fg"
            style={{ textDecoration: "none", color: "var(--fg-secondary)" }}
          >
            {c.label}
          </Link>
        </React.Fragment>
      ))}

      {/* Segmento de la planning */}
      {planningLabel && (
        <>
          {parents.length > 0 && <span style={{ color: "var(--fg-tertiary)" }}>/</span>}
          {drillIn ? (
            <button
              type="button"
              onClick={onPlanningClick}
              className="transition-colors hover:text-fg"
              style={{ color: "var(--fg-secondary)" }}
            >
              {planningLabel}
            </button>
          ) : (
            <span className="font-medium" style={{ color: "var(--fg)" }}>
              {planningLabel}
            </span>
          )}
        </>
      )}

      {/* Segmento de la semana (drill-in) */}
      {drillIn && (
        <>
          <span style={{ color: "var(--fg-tertiary)" }}>/</span>
          <span className="font-semibold" style={{ color: "var(--fg)" }}>
            {weekLabel}
          </span>
        </>
      )}
    </nav>
  );
};

interface WeekClipboard {
  weekId: number;
  planningId: number;
  weekNumber: number;
  label: string;
}

/**
 * Clipboard in-memory de DÍA (rutina).
 * Contiene el título y los ejercicios (con superset_group remapeado)
 * de la rutina copiada. No persiste entre recargas.
 */
export interface RoutineClipboard {
  /** Título de la rutina de origen (para mostrar en el banner). */
  title: string;
  /** Snapshot de ejercicios con UUIDs de superset remapeados. */
  exercises: PlanningWeekRoutineExercise[];
}

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

interface ConfirmDeleteModalProps {
  open: boolean;
  weekNumber: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  weekNumber,
  onClose,
  onConfirm,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar semana"
      size="sm"
      dismissable={!deleting}
    >
      <div className="flex flex-col gap-lg">
        {error && <ErrorBanner message={error} />}
        <p className="text-sm text-fg-secondary m-0">
          ¿Eliminar la Semana {weekNumber}? Esta acción no se puede deshacer y
          borra todas las rutinas y ejercicios del snapshot.
        </p>
        <div className="flex flex-col gap-sm">
          <Button
            variant="danger"
            size="md"
            loading={deleting}
            onClick={handleConfirm}
            className="w-full"
          >
            Eliminar semana
          </Button>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" disabled={deleting} onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ─── WeekOrderBadge ───────────────────────────────────────────────────────────

const WeekOrderBadge: React.FC<{
  weekIndex: number;
  totalWeeks: number;
  onReorder: (newPosition: number) => void;
}> = ({ weekIndex, totalWeeks, onReorder }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(weekIndex + 1));

  const badgeStyle: React.CSSProperties = {
    background: "var(--fill-tertiary)",
    color: "var(--fg-secondary)",
  };

  const commit = () => {
    setEditing(false);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= totalWeeks && n !== weekIndex + 1) {
      onReorder(n);
    } else {
      setVal(String(weekIndex + 1));
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={1}
        max={totalWeeks}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setVal(String(weekIndex + 1));
            setEditing(false);
          }
        }}
        className="w-9 h-9 rounded-sm text-center text-sm font-bold outline-none border border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none flex-shrink-0"
        style={badgeStyle}
        aria-label="Posición de la semana"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setVal(String(weekIndex + 1));
        setEditing(true);
      }}
      className="w-9 h-9 rounded-sm flex items-center justify-center text-sm font-bold flex-shrink-0 transition-opacity hover:opacity-80"
      style={badgeStyle}
      title="Cambiar orden"
    >
      {weekIndex + 1}
    </button>
  );
};

// ─── IconButton helper ────────────────────────────────────────────────────────

const IconButton: React.FC<{
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}> = ({ title, onClick, children, destructive = false, disabled = false }) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center rounded-pill transition-opacity hover:opacity-80 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
    style={
      destructive
        ? { background: "var(--destructive-alpha-12)", color: "var(--destructive)" }
        : { background: "var(--fill-tertiary)", color: "var(--fg-tertiary)" }
    }
    onMouseEnter={(e) => {
      if (!destructive && !disabled)
        (e.currentTarget as HTMLButtonElement).style.color = "var(--fg)";
    }}
    onMouseLeave={(e) => {
      if (!destructive)
        (e.currentTarget as HTMLButtonElement).style.color = "var(--fg-tertiary)";
    }}
  >
    {children}
  </button>
);

// ─── WeekCalendarReadonly — estilo StudentWeeklyProgress ──────────────────────

interface WeekCalendarReadonlyProps {
  week: PlanningWeek;
  mode: "own" | "coach";
  currentUserId: number;
  routineClipboard: RoutineClipboard | null;
  onCopyRoutine: (wkRt: PlanningWeekRoutine) => void;
  onPasteRoutine: (
    week: PlanningWeek,
    targetWkRt: PlanningWeekRoutine | null,
    targetDay: DayOfWeek | null
  ) => void;
}

const WeekCalendarReadonly: React.FC<WeekCalendarReadonlyProps> = ({
  week,
  mode,
  currentUserId,
  routineClipboard,
  onCopyRoutine,
  onPasteRoutine,
}) => {
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

  const unassigned = useMemo(
    () => week.routines.filter((wr) => effectiveDay(wr) === null),
    [week.routines]
  );

  const canEditRoutine = (wr: PlanningWeekRoutine) =>
    mode === "own" || (mode === "coach" && wr.created_by === currentUserId);

  return (
    <div className="flex flex-col gap-sm">
      <div className="grid grid-cols-7 gap-xs">
        {DAYS_OF_WEEK.map((dow, i) => {
          const wr = routineByDay.get(dow);
          const counts = wr ? routineCounts(wr) : null;

          return (
            <div key={dow} className="flex flex-col items-center gap-xs">
              <span
                className="text-xxs font-medium"
                style={{ color: "var(--fg-tertiary)" }}
              >
                {DAY_LABELS[i]}
              </span>
              {wr && counts ? (
                <RoutineDayCard
                  title={wr.routine_title}
                  exercises={counts.exercises}
                  sets={counts.sets}
                  metaOverlay={
                    <>
                      <CardIconButton
                        title="Copiar contenido del día"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyRoutine(wr);
                        }}
                      >
                        <Copy size={13} />
                      </CardIconButton>
                      {routineClipboard && canEditRoutine(wr) && (
                        <CardIconButton
                          title={`Pegar "${routineClipboard.title}" aquí`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPasteRoutine(week, wr, effectiveDay(wr));
                          }}
                        >
                          <ClipboardPaste size={13} />
                        </CardIconButton>
                      )}
                    </>
                  }
                />
              ) : (
                <div
                  className="group w-full flex flex-col items-center justify-center gap-xs rounded-lg px-xs py-md text-center"
                  style={{
                    minHeight: "84px",
                    background: "transparent",
                    border: "1px dashed var(--separator)",
                  }}
                >
                  <span
                    className="text-sm font-semibold leading-tight"
                    style={{ color: "var(--fg-tertiary)" }}
                  >
                    —
                  </span>
                  {/* Botón pegar en la misma zona que las cards con rutina.
                      La línea invisible reserva el alto del contador para alinear. */}
                  <div className="relative w-full mt-sm">
                    <span className="block text-xxs leading-tight opacity-0" aria-hidden>
                      &nbsp;
                    </span>
                    {routineClipboard && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto">
                        <CardIconButton
                          title={`Pegar "${routineClipboard.title}" aquí`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPasteRoutine(week, null, dow);
                          }}
                        >
                          <ClipboardPaste size={13} />
                        </CardIconButton>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="flex items-center gap-xs flex-wrap">
          <span
            className="text-xxs font-semibold uppercase tracking-wide"
            style={{ color: "var(--fg-tertiary)" }}
          >
            Sin día:
          </span>
          {unassigned.map((wr) => (
            <div key={wr.id} className="flex items-center gap-xxs">
              <span
                className="text-xs font-medium px-sm py-xxs rounded-pill"
                style={{
                  background: "var(--fill-tertiary)",
                  color: "var(--fg-secondary)",
                }}
              >
                {wr.routine_title}
              </span>
              <CardIconButton
                title="Copiar contenido de esta rutina"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyRoutine(wr);
                }}
              >
                <Copy size={13} />
              </CardIconButton>
              {routineClipboard && canEditRoutine(wr) && (
                <CardIconButton
                  title={`Pegar "${routineClipboard.title}" aquí`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPasteRoutine(week, wr, null);
                  }}
                >
                  <ClipboardPaste size={13} />
                </CardIconButton>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── WeekCard — card colapsable de una semana ─────────────────────────────────

interface WeekCardProps {
  week: PlanningWeek;
  weekIndex: number;
  totalWeeks: number;
  canPaste: boolean;
  clipboard: WeekClipboard | null;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (week: PlanningWeek) => void;
  onCopy: (week: PlanningWeek) => void;
  onPaste: (week: PlanningWeek) => void;
  onDelete: (week: PlanningWeek) => void;
  onReorder: (weekId: number, newPosition: number) => void;
  // Copiar/pegar a nivel rutina (día) dentro del calendario readonly
  mode: "own" | "coach";
  currentUserId: number;
  routineClipboard: RoutineClipboard | null;
  onCopyRoutine: (wkRt: PlanningWeekRoutine) => void;
  onPasteRoutine: (
    week: PlanningWeek,
    targetWkRt: PlanningWeekRoutine | null,
    targetDay: DayOfWeek | null
  ) => void;
}

const WeekCard: React.FC<WeekCardProps> = ({
  week,
  weekIndex,
  totalWeeks,
  canPaste,
  clipboard,
  expanded,
  onToggle,
  onEdit,
  onCopy,
  onPaste,
  onDelete,
  onReorder,
  mode,
  currentUserId,
  routineClipboard,
  onCopyRoutine,
  onPasteRoutine,
}) => {
  const routineCount = week.routines.length;

  return (
    <GradientSurface>
      {/* Cabecera de la card */}
      <div className="flex items-center gap-sm px-lg py-md">
        {/* OrderBadge */}
        <WeekOrderBadge
          weekIndex={weekIndex}
          totalWeeks={totalWeeks}
          onReorder={(newPos) => onReorder(week.id, newPos)}
        />

        {/* Título (toggle expand) */}
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-sm text-left min-w-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg m-0 truncate">
              {week.name ?? `Semana ${week.week_number}`}
            </p>
            <p className="text-xs m-0" style={{ color: "var(--fg-tertiary)" }}>
              {routineCount === 0
                ? "Sin rutinas"
                : `${routineCount} ${routineCount === 1 ? "rutina" : "rutinas"}`}
            </p>
          </div>
        </button>

        {/* Acciones */}
        <div className="flex items-center gap-xs flex-shrink-0">
          <IconButton title="Copiar contenido" onClick={(e) => { e.stopPropagation(); onCopy(week); }}>
            <Copy size={13} />
          </IconButton>

          {canPaste && clipboard && clipboard.weekId !== week.id && (
            <IconButton
              title={`Pegar contenido de Semana ${clipboard.weekNumber}`}
              onClick={(e) => { e.stopPropagation(); onPaste(week); }}
            >
              <Clipboard size={13} />
            </IconButton>
          )}

          <IconButton
            title="Editar semana"
            onClick={(e) => { e.stopPropagation(); onEdit(week); }}
          >
            <Pencil size={13} />
          </IconButton>

          <IconButton
            title="Eliminar semana"
            onClick={(e) => { e.stopPropagation(); onDelete(week); }}
            destructive
          >
            <Trash2 size={13} />
          </IconButton>
        </div>
      </div>

      {/* Calendario readonly al expandir */}
      {expanded && (
        <div
          className="px-lg pb-lg"
          style={{ borderTop: "1px solid var(--separator-subtle)" }}
        >
          <div className="pt-md">
            <WeekCalendarReadonly
              week={week}
              mode={mode}
              currentUserId={currentUserId}
              routineClipboard={routineClipboard}
              onCopyRoutine={onCopyRoutine}
              onPasteRoutine={onPasteRoutine}
            />
          </div>
        </div>
      )}
    </GradientSurface>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PlanningOverview: React.FC<PlanningOverviewProps> = ({
  mode,
  studentId,
  planningId,
  trail,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id ?? 0;

  const [planning, setPlanning] = useState<Planning | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Semana activa en el drill-in (NIVEL 2)
  const [selectedWeek, setSelectedWeek] = useState<PlanningWeek | null>(null);

  // Acordeón del overview: solo una semana expandida a la vez (null = ninguna)
  const [expandedWeekId, setExpandedWeekId] = useState<number | null>(null);

  // Modales del overview
  const [deleteWeekTarget, setDeleteWeekTarget] = useState<PlanningWeek | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  // Clipboard de semana (in-memory)
  const [clipboard, setClipboard] = useState<WeekClipboard | null>(null);

  // Clipboard de día/rutina (in-memory) — sobrevive navegación ◀▶ entre semanas
  const [routineClipboard, setRoutineClipboard] = useState<RoutineClipboard | null>(null);

  // Paginación del overview (máx 4 semanas por página)
  const [weeksPage, setWeeksPage] = useState(1);

  // ─── Load ───────────────────────────────────────────────────────────────────

  const loadPlanning = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let data: Planning;
      if (mode === "coach" && studentId != null) {
        data = await getStudentPlanning(studentId, planningId);
      } else {
        data = await getPlanning(planningId);
      }
      setPlanning(data);
    } catch (err) {
      setLoadError(getErrorMessage(err, "No se pudo cargar la planificación."));
    } finally {
      setLoading(false);
    }
  }, [mode, studentId, planningId]);

  useEffect(() => {
    loadPlanning();
  }, [loadPlanning]);

  // ─── API adapter ────────────────────────────────────────────────────────────

  const api = useMemo(() => {
    if (mode === "coach" && studentId != null) {
      return {
        addWeek: (payload: AddWeekPayload) =>
          coachAddWeek(studentId, planningId, payload),
        updateWeek: (weekId: number, payload: UpdateWeekPayload) =>
          coachUpdateWeek(studentId, weekId, payload),
        deleteWeek: (weekId: number) => coachDeleteWeek(studentId, weekId),
        reorderWeeks: (weekIds: number[]) =>
          coachReorderWeeks(studentId, planningId, { week_ids: weekIds }),
        copyWeekRoutines: (sourceWeekId: number, targetWeekId: number) =>
          coachCopyWeekRoutines(studentId, sourceWeekId, targetWeekId),
        appendWeekFromCopy: (sourceWeekId: number) =>
          appendWeekFromCopy(studentId, planningId, sourceWeekId),
        setCurrentWeek: (weekNumber: number | null) =>
          setStudentPlanningCurrentWeek(studentId, planningId, weekNumber),
        updatePlanning: (payload: Partial<Planning>) =>
          updateStudentPlanning(studentId, planningId, payload),
        canArchive: false,
      };
    }
    return {
      addWeek: (payload: AddWeekPayload) => addWeek(planningId, payload),
      updateWeek: (weekId: number, payload: UpdateWeekPayload) =>
        updateWeek(weekId, payload),
      deleteWeek: (weekId: number) => deleteWeek(weekId),
      reorderWeeks: (weekIds: number[]) =>
        reorderWeeks(planningId, { week_ids: weekIds }),
      copyWeekRoutines: (sourceWeekId: number, targetWeekId: number) =>
        copyWeekRoutines(sourceWeekId, targetWeekId),
      appendWeekFromCopy: (sourceWeekId: number) => {
        return addWeek(planningId, {}).then((newWeek) =>
          copyWeekRoutines(sourceWeekId, newWeek.id).then(() => newWeek)
        );
      },
      setCurrentWeek: (weekNumber: number | null) =>
        setCurrentWeekOverride(planningId, weekNumber),
      updatePlanning: (payload: Partial<Planning>) =>
        updatePlanning(planningId, payload),
      canArchive: true,
    };
  }, [mode, studentId, planningId]);

  // ─── Semanas ordenadas ───────────────────────────────────────────────────────

  const weeks = useMemo(
    () =>
      [...(planning?.weeks ?? [])].sort((a, b) => a.week_number - b.week_number),
    [planning?.weeks]
  );

  const currentWeekNumber =
    planning?.current_week_override ?? planning?.current_week ?? 1;

  // ─── Paginación de semanas (máx 4 por página) ────────────────────────────────

  // La card "Agregar semana" cuenta como un slot más (va al final). Por eso el
  // total de slots es weeks.length + 1 → si las semanas llenan justo la página,
  // el botón "Agregar" cae en una página nueva como primera card.
  const totalWeekSlots = weeks.length + 1;
  const totalWeekPages = Math.max(1, Math.ceil(totalWeekSlots / WEEKS_PER_PAGE));

  // Clamp si la página actual queda fuera de rango (ej. al borrar semanas)
  useEffect(() => {
    if (weeksPage > totalWeekPages) setWeeksPage(totalWeekPages);
  }, [weeksPage, totalWeekPages]);

  const pageStartIndex = (weeksPage - 1) * WEEKS_PER_PAGE;
  const pagedWeeks = weeks.slice(pageStartIndex, pageStartIndex + WEEKS_PER_PAGE);
  const isLastWeekPage = weeksPage >= totalWeekPages;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAddWeek = async () => {
    setActionError(null);
    try {
      const newWeek = await api.addWeek({});
      setPlanning((prev) =>
        prev
          ? { ...prev, weeks: [...(prev.weeks ?? []), { ...newWeek, routines: [] }] }
          : prev
      );
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo agregar la semana."));
    }
  };

  const handleDeleteWeek = async (weekId: number) => {
    await api.deleteWeek(weekId);
    setPlanning((prev) =>
      prev
        ? { ...prev, weeks: (prev.weeks ?? []).filter((w) => w.id !== weekId) }
        : prev
    );
    if (selectedWeek?.id === weekId) setSelectedWeek(null);
  };

  const handleReorderWeek = async (weekId: number, newPosition: number) => {
    const currentWeeks = [...weeks];
    const fromIdx = currentWeeks.findIndex((w) => w.id === weekId);
    if (fromIdx < 0) return;
    const toIdx = newPosition - 1;
    if (toIdx < 0 || toIdx >= currentWeeks.length || toIdx === fromIdx) return;

    const [moved] = currentWeeks.splice(fromIdx, 1);
    currentWeeks.splice(toIdx, 0, moved);
    const newOrder = currentWeeks.map((w) => w.id);

    setActionError(null);
    try {
      await api.reorderWeeks(newOrder);
      setPlanning((prev) =>
        prev
          ? {
              ...prev,
              weeks: currentWeeks.map((w, i) => ({ ...w, week_number: i + 1 })),
            }
          : prev
      );
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo reordenar."));
    }
  };

  const handleCopyWeek = (week: PlanningWeek) => {
    setClipboard({
      weekId: week.id,
      planningId,
      weekNumber: week.week_number,
      label: week.name ?? `Semana ${week.week_number}`,
    });
  };

  const handlePasteWeek = async (targetWeek: PlanningWeek) => {
    if (!clipboard) return;
    setActionError(null);
    try {
      await api.copyWeekRoutines(clipboard.weekId, targetWeek.id);
      await loadPlanning();
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo pegar la semana."));
    }
  };

  const handleAppendFromClipboard = async () => {
    if (!clipboard) return;
    setActionError(null);
    try {
      await api.appendWeekFromCopy(clipboard.weekId);
      await loadPlanning();
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo agregar la semana."));
    }
  };

  /**
   * Copia el contenido de una rutina de la semana al clipboard de día.
   * Aplica remapSupersetGroupsRaw para que los UUIDs de superset no se compartan
   * entre la fuente y el destino al pegar.
   */
  const handleCopyRoutine = useCallback((wkRt: PlanningWeekRoutine) => {
    setRoutineClipboard({
      title: wkRt.routine_title,
      exercises: remapSupersetGroupsRaw(wkRt.exercises),
    });
  }, []);

  /** Mergea una semana actualizada en el planning SIN tocar selectedWeek. */
  const mergeWeekIntoPlanning = useCallback((updatedWeek: PlanningWeek) => {
    setPlanning((prev) =>
      prev
        ? {
            ...prev,
            weeks: (prev.weeks ?? []).map((w) =>
              w.id === updatedWeek.id ? updatedWeek : w
            ),
          }
        : prev
    );
  }, []);

  const handleWeekUpdated = useCallback(
    (updatedWeek: PlanningWeek) => {
      setSelectedWeek(updatedWeek);
      mergeWeekIntoPlanning(updatedWeek);
    },
    [mergeWeekIntoPlanning]
  );

  /**
   * Pega el clipboard de día en una celda de CUALQUIER semana desde el resumen.
   * Reusa el helper compartido (regla crítica: manda todas las rutinas) y
   * mergea sin navegar al drill-in.
   */
  const handlePasteRoutineIntoWeek = useCallback(
    async (
      targetWeek: PlanningWeek,
      targetWkRt: PlanningWeekRoutine | null,
      targetDay: DayOfWeek | null
    ) => {
      if (!routineClipboard) return;
      setActionError(null);
      try {
        const updatedWeek = await pasteRoutineIntoWeek({
          clipboardTitle: routineClipboard.title,
          clipboardExercises: routineClipboard.exercises,
          week: targetWeek,
          mode,
          studentId,
          targetWkRt,
          targetDay,
        });
        mergeWeekIntoPlanning(updatedWeek);
      } catch (err) {
        setActionError(getErrorMessage(err, "No se pudo pegar la rutina."));
      }
    },
    [routineClipboard, mode, studentId, mergeWeekIntoPlanning]
  );

  // ─── Render: loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-xl">
        <PlanningBreadcrumb parents={trail} />
        <div className="flex items-center gap-md flex-wrap">
          <div className="flex flex-col gap-sm flex-1">
            <SkeletonLine height={28} width="40%" />
            <SkeletonLine height={16} width="25%" />
          </div>
          <SkeletonBox width={120} height={44} />
        </div>
        <div className="flex flex-col gap-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg"
              style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
            >
              <div className="flex items-center gap-sm px-lg py-md">
                <SkeletonBox width={36} height={36} />
                <div className="flex-1 flex flex-col gap-xs">
                  <SkeletonLine height={16} width="30%" />
                  <SkeletonLine height={12} width="20%" />
                </div>
                <SkeletonBox width={80} height={28} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-xl">
        <PlanningBreadcrumb parents={trail} />
        <div className="flex flex-col gap-lg items-center py-xxl">
          <ErrorBanner message={loadError} />
          <Button variant="outline" onClick={loadPlanning}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!planning) return null;

  const canPaste = clipboard !== null && clipboard.planningId === planningId;

  // ─── Render: NIVEL 2 — Editar semana (drill-in) ──────────────────────────────

  if (selectedWeek) {
    const weekData =
      (planning.weeks ?? []).find((w) => w.id === selectedWeek.id) ?? selectedWeek;

    const weekIndex = weeks.findIndex((w) => w.id === weekData.id);
    const canGoPrev = weekIndex > 0;
    const canGoNext = weekIndex < weeks.length - 1;

    const navigateToPrev = () => {
      if (canGoPrev) setSelectedWeek(weeks[weekIndex - 1]);
    };
    const navigateToNext = () => {
      if (canGoNext) setSelectedWeek(weeks[weekIndex + 1]);
    };

    return (
      <div className="flex flex-col gap-xl">
        {/* ── Breadcrumb único (incluye la semana) ── */}
        <PlanningBreadcrumb
          parents={trail}
          planningLabel={planning.title}
          weekLabel={weekData.name ?? `Semana ${weekData.week_number}`}
          onPlanningClick={() => setSelectedWeek(null)}
        />

        {/* ── Fila de navegación entre semanas ── */}
        <div className="flex items-center gap-md">
          <Button
            variant="outline"
            size="md"
            onClick={navigateToPrev}
            disabled={!canGoPrev}
            iconLeft={<ChevronLeft size={16} />}
            className="flex-shrink-0"
          >
            Anterior
          </Button>

          <div className="flex-1 flex items-center gap-sm justify-center flex-wrap">
            <span className="text-base font-semibold text-fg text-center">
              {`Semana ${weekData.week_number} de ${weeks.length}`}
              {weekData.name ? ` · ${weekData.name}` : ""}
            </span>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={navigateToNext}
            disabled={!canGoNext}
            iconRight={<ChevronRight size={16} />}
            className="flex-shrink-0"
          >
            Siguiente
          </Button>
        </div>

        {actionError && <ErrorBanner message={actionError} dismissible />}

        {/* Banner clipboard de día — se mantiene al navegar ◀▶ entre semanas */}
        {routineClipboard && (
          <div
            className="flex items-center justify-between gap-md px-xl py-md rounded-lg"
            style={{
              background: "var(--warning-alpha-08)",
              border: "1px solid var(--warning-alpha-20)",
            }}
          >
            <div className="flex items-center gap-sm">
              <Clipboard size={14} style={{ color: "var(--warning)" }} />
              <span className="text-sm text-fg">
                Día copiado: <strong>{routineClipboard.title}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRoutineClipboard(null)}
              className="w-7 h-7 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors flex-shrink-0"
              style={{ background: "var(--fill-tertiary)" }}
              title="Limpiar clipboard"
            >
              <Check size={13} />
            </button>
          </div>
        )}

        <PlanningWeekDetail
          mode={mode}
          studentId={studentId}
          planningId={planningId}
          week={weekData}
          currentUserId={currentUserId}
          onWeekUpdated={handleWeekUpdated}
          routineClipboard={routineClipboard}
          onCopyRoutine={handleCopyRoutine}
          previousWeek={weekIndex > 0 ? weeks[weekIndex - 1] : undefined}
        />
      </div>
    );
  }

  // ─── Render: NIVEL 1 — Overview (lista de WeekCards) ────────────────────────

  return (
    <div className="flex flex-col gap-xl">
      {/* ── Breadcrumb ── */}
      <PlanningBreadcrumb parents={trail} planningLabel={planning.title} />

      {/* ── Barra de controles (VIEW_BASES #1) ── */}
      <div className="flex items-center gap-md flex-wrap">
        {/* Izquierda: título + badge + subtítulo */}
        <div className="flex flex-col gap-xxs min-w-0">
          <div className="flex items-center gap-sm flex-wrap">
            <h1 className="text-xl font-bold text-fg m-0">{planning.title}</h1>
            <PlanningStatusBadge status={planning.status} />
          </div>
          <p className="text-sm text-fg-secondary m-0">
            {weeks.length} {weeks.length === 1 ? "semana" : "semanas"}
            {weeks.length > 0 ? ` · Semana actual: ${currentWeekNumber}` : ""}
          </p>
        </div>

        {/* Derecha: acciones (ml-auto) */}
        <div className="flex items-center gap-sm flex-wrap ml-auto flex-shrink-0">
          {mode === "own" && (
            <Button
              variant="outline"
              size="md"
              onClick={() => setBulkAssignOpen(true)}
            >
              Asignar a alumnos
            </Button>
          )}

          {mode === "coach" && studentId != null && (
            <Button
              variant="ghost"
              size="md"
              onClick={async () => {
                try {
                  await duplicateStudentPlanningToLibrary(studentId, planningId);
                } catch (err) {
                  setActionError(getErrorMessage(err, "No se pudo duplicar."));
                }
              }}
            >
              Duplicar a mi biblioteca
            </Button>
          )}
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} dismissible />}

      {/* Clipboard indicator */}
      {clipboard && clipboard.planningId === planningId && (
        <div
          className="flex items-center justify-between gap-md px-xl py-md rounded-lg"
          style={{
            background: "var(--primary-alpha-08)",
            border: "1px solid var(--primary-alpha-20)",
          }}
        >
          <div className="flex items-center gap-sm">
            <Clipboard size={14} style={{ color: "var(--primary)" }} />
            <span className="text-sm text-fg">
              Copiado: <strong>{clipboard.label}</strong>
            </span>
          </div>
          <div className="flex items-center gap-sm">
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus size={13} />}
              onClick={handleAppendFromClipboard}
            >
              Pegar como semana nueva
            </Button>
            <button
              type="button"
              onClick={() => setClipboard(null)}
              className="w-7 h-7 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors"
              style={{ background: "var(--fill-tertiary)" }}
              title="Cerrar clipboard"
            >
              <Check size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Lista de WeekCards ── */}
      {weeks.length === 0 ? (
        /* Empty state dashed */
        <button
          type="button"
          onClick={handleAddWeek}
          className="w-full flex flex-col items-center justify-center gap-sm rounded-lg transition-opacity hover:opacity-80"
          style={{
            border: "1.5px dashed var(--separator)",
            background: "transparent",
            minHeight: WEEK_CARD_COLLAPSED_MIN_HEIGHT,
            color: "var(--fg-secondary)",
          }}
        >
          <Plus size={18} style={{ color: "var(--fg-tertiary)" }} />
          <span className="text-sm font-semibold">
            Esta planificación no tiene semanas. Agregar semana
          </span>
        </button>
      ) : (
        <div className="flex flex-col gap-sm">
          {pagedWeeks.map((week, localIdx) => {
            const absoluteIdx = pageStartIndex + localIdx;
            return (
              <WeekCard
                key={week.id}
                week={week}
                weekIndex={absoluteIdx}
                totalWeeks={weeks.length}
                canPaste={canPaste}
                clipboard={clipboard}
                expanded={expandedWeekId === week.id}
                onToggle={() =>
                  setExpandedWeekId((prev) => (prev === week.id ? null : week.id))
                }
                onEdit={(w) => setSelectedWeek(w)}
                onCopy={handleCopyWeek}
                onPaste={handlePasteWeek}
                onDelete={(w) => setDeleteWeekTarget(w)}
                onReorder={handleReorderWeek}
                mode={mode}
                currentUserId={currentUserId}
                routineClipboard={routineClipboard}
                onCopyRoutine={handleCopyRoutine}
                onPasteRoutine={handlePasteRoutineIntoWeek}
              />
            );
          })}

          {/* Botón dashed "Agregar semana" — solo en la última página, como un
              slot más de la grilla (puede quedar como primera card de su página).
              Replica el alto de una WeekCard colapsada: px-lg py-md + fila h-9. */}
          {isLastWeekPage && (
            <button
              type="button"
              onClick={handleAddWeek}
              className="w-full rounded-lg transition-opacity hover:opacity-80"
              style={{
                border: "1px dashed var(--separator)",
                background: "transparent",
                color: "var(--fg-secondary)",
              }}
            >
              <div className="flex items-center justify-center gap-sm px-lg py-md">
                <div className="flex h-9 items-center justify-center gap-sm">
                  <Plus size={16} style={{ color: "var(--fg-tertiary)" }} />
                  <span className="text-sm font-semibold">Agregar semana</span>
                </div>
              </div>
            </button>
          )}

          {/* Paginación (máx 4 cards por página, contando el botón "Agregar") */}
          <Pagination
            page={weeksPage}
            perPage={WEEKS_PER_PAGE}
            total={totalWeekSlots}
            onPageChange={setWeeksPage}
          />
        </div>
      )}

      {/* Modals */}
      <ConfirmDeleteModal
        open={deleteWeekTarget !== null}
        weekNumber={deleteWeekTarget?.week_number ?? 0}
        onClose={() => setDeleteWeekTarget(null)}
        onConfirm={async () => {
          if (!deleteWeekTarget) return;
          await handleDeleteWeek(deleteWeekTarget.id);
        }}
      />

      {mode === "own" && planning && bulkAssignOpen && (
        <BulkAssignPlanningModal
          open={bulkAssignOpen}
          planningId={planningId}
          planningTitle={planning.title}
          onClose={() => setBulkAssignOpen(false)}
        />
      )}
    </div>
  );
};
