"use client";

/**
 * StudentWeeklyProgress — Calendario semanal del alumno con detalle de logs.
 *
 * Navegación semana anterior/siguiente. Los días con entrenamientos se resaltan;
 * click abre el detalle completo del log (FinishedWorkoutDetail) en un panel
 * lateral (desktop) o sección expandida (mobile/narrow).
 *
 * Rango de fechas: lunes–domingo en TZ Buenos Aires (America/Argentina/Buenos_Aires).
 *
 * Props:
 *   studentId — id del alumno a mostrar
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Dumbbell, X } from "lucide-react";
import { listStudentLogsByDateRange } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox, SkeletonLine, SkeletonCircle } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FinishedWorkoutDetail } from "@/components/coaching/FinishedWorkoutDetail";
import {
  startOfWeekMonday,
  toARDateKey,
  formatPerformedDateShort,
  APP_TIME_ZONE,
} from "@/lib/datetime";
import type { StudentLogListItem } from "@/lib/api/types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/**
 * Colores para las celdas de día (tokens day-mon…day-sun).
 * Índice 0 = lunes, 6 = domingo.
 */
const DAY_COLORS: ReadonlyArray<string> = [
  "var(--day-mon)",
  "var(--day-tue)",
  "var(--day-wed)",
  "var(--day-thu)",
  "var(--day-fri)",
  "var(--day-sat)",
  "var(--day-sun)",
];

// ─── Helpers de fechas (TZ Buenos Aires) ─────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}

/** Devuelve el lunes de la semana para `referenceDate` en TZ AR. */
function getWeekStart(referenceDate: Date): Date {
  // startOfWeekMonday opera en hora local — para que sea correcto en AR TZ,
  // usamos la fecha en AR: parseamos el dateKey AR y construimos el lunes local.
  const arKey = toARDateKey(referenceDate); // "YYYY-MM-DD"
  const [y, m, d] = arKey.split("-").map(Number);
  // Construir fecha como medianoche local con las partes AR
  const localDate = new Date(y, m - 1, d);
  return startOfWeekMonday(localDate);
}

/** Formatea "YYYY-MM-DD" → número del día del mes. */
function dayOfMonth(dateKey: string): number {
  return parseInt(dateKey.slice(8, 10), 10);
}

/** Formatea "YYYY-MM-DD" → "ene", "feb", etc. */
function monthShort(dateKey: string): string {
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const m = parseInt(dateKey.slice(5, 7), 10) - 1;
  return months[m] ?? "";
}

/** Formatea el rango de la semana: "3 – 9 ene", o "30 ene – 5 feb". */
function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const startKey = toARDateKey(monday);
  const endKey = toARDateKey(sunday);

  const startDay = dayOfMonth(startKey);
  const endDay = dayOfMonth(endKey);
  const startMonth = monthShort(startKey);
  const endMonth = monthShort(endKey);

  if (startMonth === endMonth) {
    return `${startDay} – ${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}

/** Convierte performed_at ISO a dateKey en TZ AR. */
function logDateKey(performedAt: string): string {
  return toARDateKey(new Date(performedAt));
}

/** Hoy en dateKey AR. */
function todayARKey(): string {
  return toARDateKey(new Date());
}

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface DayCellData {
  /** YYYY-MM-DD en TZ AR */
  dateKey: string;
  /** Número del día del mes */
  day: number;
  /** Índice 0=lunes … 6=domingo */
  weekdayIndex: number;
  /** Logs entrenados este día */
  logs: StudentLogListItem[];
  isToday: boolean;
  isFuture: boolean;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Skeleton del calendario semanal */
function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-lg">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <SkeletonLine width={32} height={32} className="rounded-pill" />
        <SkeletonLine width={120} height={16} />
        <SkeletonLine width={32} height={32} className="rounded-pill" />
      </div>
      {/* Celdas */}
      <div className="grid grid-cols-7 gap-xs">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-xs">
            <SkeletonLine width={28} height={11} />
            <SkeletonBox width="100%" height={64} className="rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Celda de un día */
interface DayCellProps {
  cell: DayCellData;
  selected: boolean;
  onSelect: (dateKey: string, logId: number) => void;
}

const DayCell: React.FC<DayCellProps> = ({ cell, selected, onSelect }) => {
  const hasTrained = cell.logs.length > 0;
  const color = DAY_COLORS[cell.weekdayIndex] ?? "var(--fill-tertiary)";
  const isClickable = hasTrained;

  const handleClick = () => {
    if (!isClickable) return;
    // Al hacer click, seleccionamos el primer log del día
    const firstLog = cell.logs[0];
    if (firstLog) onSelect(cell.dateKey, firstLog.id);
  };

  return (
    <div className="flex flex-col items-center gap-xs">
      {/* Label del día */}
      <span
        className="text-xxs font-medium"
        style={{
          color: cell.isToday ? "var(--primary)" : "var(--fg-tertiary)",
        }}
      >
        {DAY_LABELS[cell.weekdayIndex]}
      </span>

      {/* Celda principal */}
      <button
        type="button"
        disabled={!isClickable}
        onClick={handleClick}
        className="w-full flex flex-col items-center justify-center gap-xxs rounded-lg transition-all"
        style={{
          minHeight: "64px",
          cursor: isClickable ? "pointer" : "default",
          background: selected
            ? color
            : hasTrained
              ? `${color.replace("0.35", "0.15")}`
              : "var(--fill-quaternary)",
          border: selected
            ? `2px solid ${color.replace("rgba(", "rgba(").replace(", 0.35)", ", 0.8)")}`
            : cell.isToday
              ? "2px solid var(--primary-alpha-30)"
              : "1px solid transparent",
          opacity: cell.isFuture ? 0.4 : 1,
        }}
        aria-label={
          hasTrained
            ? `${cell.day} — ${cell.logs.length} entrenamiento(s)`
            : `${cell.day}`
        }
      >
        {/* Número del día */}
        <span
          className="text-sm font-semibold"
          style={{
            color: hasTrained || selected ? "var(--fg)" : "var(--fg-tertiary)",
          }}
        >
          {cell.day}
        </span>

        {/* Indicador de entrenamiento */}
        {hasTrained && (
          <Dumbbell
            size={11}
            style={{
              color: selected ? "var(--fg)" : color.replace("0.35", "0.9"),
            }}
          />
        )}

        {/* Contador de logs (si hay más de 1) */}
        {cell.logs.length > 1 && (
          <span
            className="text-xxs font-semibold px-xs rounded-pill"
            style={{
              background: "var(--fg)",
              color: "var(--bg)",
            }}
          >
            ×{cell.logs.length}
          </span>
        )}
      </button>
    </div>
  );
};

/** Lista de logs del día seleccionado (cuando hay más de 1) */
interface DayLogsListProps {
  logs: StudentLogListItem[];
  selectedLogId: number;
  onSelectLog: (logId: number) => void;
}

const DayLogsList: React.FC<DayLogsListProps> = ({
  logs,
  selectedLogId,
  onSelectLog,
}) => {
  if (logs.length <= 1) return null;

  return (
    <div className="flex flex-col gap-xs">
      <span className="text-xs font-medium text-fg-secondary">
        Entrenamientos del día
      </span>
      {logs.map((log) => (
        <button
          key={log.id}
          type="button"
          onClick={() => onSelectLog(log.id)}
          className="flex items-center gap-md px-md py-sm rounded-md text-left transition-colors"
          style={{
            background:
              log.id === selectedLogId
                ? "var(--primary-alpha-12)"
                : "var(--fill-quaternary)",
            border:
              log.id === selectedLogId
                ? "1px solid var(--primary-alpha-20)"
                : "1px solid transparent",
            color: "var(--fg)",
          }}
        >
          <Dumbbell size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <div className="flex flex-col gap-xxs min-w-0 flex-1">
            <span className="text-xs font-semibold truncate">{log.routine_title}</span>
            {log.duration_minutes && (
              <span className="text-xxs text-fg-tertiary">
                {log.duration_minutes} min
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

interface StudentWeeklyProgressProps {
  studentId: number;
}

/**
 * StudentWeeklyProgress
 *
 * Calendario semanal del alumno + detalle de log embebido.
 * Desktop: panel lateral derecho con el detalle.
 * Mobile/narrow: detalle debajo del calendario.
 */
export const StudentWeeklyProgress: React.FC<StudentWeeklyProgressProps> = ({
  studentId,
}) => {
  // ─ Estado semana ──────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  // ─ Datos de logs de la semana ─────────────────────────────────────────────
  const [logs, setLogs] = useState<StudentLogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─ Selección de día/log ───────────────────────────────────────────────────
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  // Ref para scroll en mobile al abrir el detalle
  const detailRef = useRef<HTMLDivElement>(null);

  // ─ Cargar logs ────────────────────────────────────────────────────────────
  const loadLogs = useCallback(async (monday: Date) => {
    setLoading(true);
    setError(null);
    try {
      const startDate = toARDateKey(monday);
      const endDate = toARDateKey(addDays(monday, 6));
      const data = await listStudentLogsByDateRange(studentId, { startDate, endDate });
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el progreso semanal"));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadLogs(weekStart);
    // Limpiar selección al cambiar semana
    setSelectedDateKey(null);
    setSelectedLogId(null);
  }, [weekStart, loadLogs]);

  // ─ Navegación ─────────────────────────────────────────────────────────────
  const goToPrevWeek = () => setWeekStart((w) => addDays(w, -7));
  const goToNextWeek = () => setWeekStart((w) => addDays(w, 7));

  // La semana "máxima" es la semana actual (no permitir navegar hacia el futuro más allá del domingo actual)
  const currentWeekStart = getWeekStart(new Date());
  const canGoNext = weekStart < currentWeekStart;

  // ─ Indexar logs por dateKey ───────────────────────────────────────────────
  const logsByDate = React.useMemo(() => {
    const map = new Map<string, StudentLogListItem[]>();
    for (const log of logs) {
      const key = logDateKey(log.performed_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return map;
  }, [logs]);

  // ─ Construir celdas de los 7 días ─────────────────────────────────────────
  const today = todayARKey();
  const todayDate = new Date();

  const dayCells: DayCellData[] = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateKey = toARDateKey(date);
      return {
        dateKey,
        day: dayOfMonth(dateKey),
        weekdayIndex: i,
        logs: logsByDate.get(dateKey) ?? [],
        isToday: dateKey === today,
        isFuture: date > todayDate,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, logsByDate, today]);

  // ─ Manejar selección de día/log ───────────────────────────────────────────
  const handleSelectDayLog = (dateKey: string, logId: number) => {
    if (selectedLogId === logId) {
      // Toggle: deseleccionar
      setSelectedDateKey(null);
      setSelectedLogId(null);
    } else {
      setSelectedDateKey(dateKey);
      setSelectedLogId(logId);
      // En mobile, scroll al detalle
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleSelectLog = (logId: number) => {
    setSelectedLogId(logId);
  };

  const handleCloseDetail = () => {
    setSelectedDateKey(null);
    setSelectedLogId(null);
  };

  // ─ Logs del día seleccionado ──────────────────────────────────────────────
  const selectedDayLogs = selectedDateKey ? (logsByDate.get(selectedDateKey) ?? []) : [];

  const totalTrainingDays = logsByDate.size;

  // ─ Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-lg">
      {/* ── Calendario ── */}
      <div
        className="rounded-lg p-xl flex flex-col gap-lg"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        {/* Navegación de semana */}
        <div className="flex items-center justify-between gap-md">
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<ChevronLeft size={16} />}
            onClick={goToPrevWeek}
            aria-label="Semana anterior"
            className="w-9 h-9 p-0 flex items-center justify-center"
          />

          <div className="flex flex-col items-center gap-xxs">
            <span className="text-base font-semibold text-fg">
              {formatWeekRange(weekStart)}
            </span>
            {!loading && totalTrainingDays > 0 && (
              <span className="text-xs text-fg-tertiary">
                {totalTrainingDays} día(s) entrenado(s)
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            iconRight={<ChevronRight size={16} />}
            onClick={goToNextWeek}
            disabled={!canGoNext}
            aria-label="Semana siguiente"
            className="w-9 h-9 p-0 flex items-center justify-center"
          />
        </div>

        {/* Error */}
        {error && <ErrorBanner message={error} dismissible />}

        {/* Celdas */}
        {loading ? (
          <CalendarSkeleton />
        ) : (
          <div className="grid grid-cols-7 gap-xs">
            {dayCells.map((cell) => (
              <DayCell
                key={cell.dateKey}
                cell={cell}
                selected={cell.dateKey === selectedDateKey}
                onSelect={handleSelectDayLog}
              />
            ))}
          </div>
        )}

        {/* Leyenda */}
        {!loading && (
          <div className="flex items-center gap-lg justify-center flex-wrap">
            <div className="flex items-center gap-xs">
              <div
                className="w-3 h-3 rounded-pill"
                style={{ background: "var(--day-mon)" }}
              />
              <span className="text-xxs text-fg-tertiary">Entrenado</span>
            </div>
            <div className="flex items-center gap-xs">
              <div
                className="w-3 h-3 rounded-pill"
                style={{ background: "var(--primary-alpha-30)", border: "2px solid var(--primary-alpha-30)" }}
              />
              <span className="text-xxs text-fg-tertiary">Hoy</span>
            </div>
            <div className="flex items-center gap-xs">
              <div
                className="w-3 h-3 rounded-pill"
                style={{ background: "var(--fill-quaternary)" }}
              />
              <span className="text-xxs text-fg-tertiary">Sin entrenamiento</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Empty state semanal ── */}
      {!loading && !error && totalTrainingDays === 0 && (
        <EmptyState
          icon={<Dumbbell size={24} />}
          title="Sin entrenamientos esta semana"
          description="El alumno no registró entrenamientos en este período."
        />
      )}

      {/* ── Panel de detalle ── */}
      {selectedLogId !== null && (
        <div
          ref={detailRef}
          className="rounded-lg p-xl flex flex-col gap-lg relative"
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          {/* Botón cerrar el panel */}
          <button
            type="button"
            onClick={handleCloseDetail}
            className="absolute top-md right-md w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors"
            style={{ background: "var(--fill-tertiary)" }}
            aria-label="Cerrar detalle"
          >
            <X size={14} />
          </button>

          {/* Fecha seleccionada */}
          {selectedDateKey && (
            <div className="flex items-center gap-sm">
              <Calendar size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <span className="text-sm font-semibold text-fg">
                {formatPerformedDateShort(
                  (() => {
                    const [y, m, d] = selectedDateKey.split("-").map(Number);
                    return new Date(y, m - 1, d);
                  })(),
                )}
              </span>
            </div>
          )}

          {/* Selector de log si hay varios en el día */}
          {selectedDayLogs.length > 1 && (
            <DayLogsList
              logs={selectedDayLogs}
              selectedLogId={selectedLogId}
              onSelectLog={handleSelectLog}
            />
          )}

          {/* Detalle del log */}
          <FinishedWorkoutDetail
            key={selectedLogId}
            studentId={studentId}
            logId={selectedLogId}
          />
        </div>
      )}
    </div>
  );
};
