"use client";

/**
 * CoachCalendarCard — Calendario mensual del coach.
 *
 * Muestra qué alumnos entrenaron cada día del mes usando getCoachCalendar.
 * Click en un día con entrenamientos abre un popover/modal con el listado.
 * Navegación de mes (anterior/siguiente) sin permitir meses futuros.
 * Filtro opcional por grupo (selector poblado con listGroups).
 *
 * Props:
 *   className? — clase CSS adicional para el contenedor raíz.
 *
 * Autosuficiente: no requiere props obligatorias.
 * El líder integra <CoachCalendarCard /> directamente en el dashboard.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, Users } from "lucide-react";
import { getCoachCalendar, listGroups } from "@/lib/api/coaching";
import { toARDateKey } from "@/lib/datetime";
import { getErrorMessage, getDisplayName, getUserInitials } from "@/lib/utils";
import { useAliases } from "@/contexts/AliasContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import type { CoachCalendarWorkout, TrainingGroup } from "@/lib/api/types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const WEEK_DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

const SEARCH_THRESHOLD = 8;
const ITEMS_PER_PAGE = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getTodayInAR(): { year: number; month: number; day: number } {
  // toARDateKey usa TZ Buenos Aires: genera "YYYY-MM-DD" en ese TZ
  const key = toARDateKey(new Date());
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface SelectedDay {
  dateKey: string;
  label: string;
  workouts: CoachCalendarWorkout[];
}

// ─── Subcomponente: CalendarGrid ──────────────────────────────────────────────

interface CalendarGridProps {
  year: number;
  month: number;
  loading: boolean;
  days: Record<string, CoachCalendarWorkout[]>;
  onDayClick: (day: SelectedDay) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  loading,
  days,
  onDayClick,
}) => {
  const today = getTodayInAR();

  const startingDayOfWeek = new Date(year, month, 1).getDay(); // 0=Dom, 6=Sáb
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = useMemo<Array<number | null>>(() => {
    const arr: Array<number | null> = [];
    for (let i = 0; i < startingDayOfWeek; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [startingDayOfWeek, daysInMonth]);

  if (loading) {
    return (
      <div className="flex flex-col gap-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-xs">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-fg-tertiary py-xs">
              {d}
            </div>
          ))}
        </div>
        {/* Skeleton grid */}
        <div className="grid grid-cols-7 gap-xs">
          {Array.from({ length: 35 }).map((_, i) => (
            <SkeletonBox key={i} height={36} className="rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xs">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-xs mb-xs">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-fg-tertiary py-xs tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-xs">
        {calendarCells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateKey = formatDateKey(year, month, day);
          const workoutsOnDay = days[dateKey] ?? [];
          const hasWorkouts = workoutsOnDay.length > 0;

          const isToday =
            day === today.day &&
            month === today.month &&
            year === today.year;

          // Futuro: día posterior a hoy (AR)
          const isFuture =
            year > today.year ||
            (year === today.year && month > today.month) ||
            (year === today.year && month === today.month && day > today.day);

          const handleClick = () => {
            if (!hasWorkouts) return;
            onDayClick({
              dateKey,
              label: `${day} de ${MONTH_NAMES[month]}`,
              workouts: workoutsOnDay,
            });
          };

          return (
            <button
              key={day}
              type="button"
              onClick={handleClick}
              disabled={!hasWorkouts}
              className={[
                "aspect-square flex flex-col items-center justify-center rounded-sm text-sm font-medium",
                "transition-colors duration-100 relative",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                isToday && hasWorkouts
                  ? "border-2 text-flame font-semibold"
                  : isToday
                    ? "border-2 text-fg font-semibold"
                    : hasWorkouts
                      ? "text-flame font-semibold cursor-pointer hover:opacity-80"
                      : isFuture
                        ? "text-fg-tertiary opacity-50 cursor-default"
                        : "text-fg-secondary cursor-default",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                isToday && hasWorkouts
                  ? {
                      background: "var(--flame-alpha-20)",
                      borderColor: "var(--flame)",
                    }
                  : isToday
                    ? {
                        background: "var(--primary-alpha-12)",
                        borderColor: "var(--primary)",
                      }
                    : hasWorkouts
                      ? {
                          background: "var(--flame-alpha-10)",
                          border: "0.5px solid var(--flame-alpha-25)",
                        }
                      : isFuture
                        ? { background: "var(--fill-quaternary)" }
                        : { background: "var(--fill-quaternary)" }
              }
              aria-label={
                hasWorkouts
                  ? `${day} de ${MONTH_NAMES[month]}: ${workoutsOnDay.length} entreno${workoutsOnDay.length !== 1 ? "s" : ""}`
                  : `${day} de ${MONTH_NAMES[month]}`
              }
            >
              <span>{day}</span>
              {hasWorkouts && (
                <span
                  className="w-1 h-1 rounded-pill mt-xxs flex-shrink-0"
                  style={{ background: "var(--flame)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-xl mt-sm">
        <div className="flex items-center gap-xs">
          <span
            className="w-3 h-3 rounded-xs border"
            style={{
              background: "var(--flame-alpha-10)",
              borderColor: "var(--flame-alpha-25)",
            }}
          />
          <span className="text-xs text-fg-secondary">Con entrenos</span>
        </div>
        <div className="flex items-center gap-xs">
          <span
            className="w-3 h-3 rounded-xs border-2"
            style={{
              background: "var(--primary-alpha-12)",
              borderColor: "var(--primary)",
            }}
          />
          <span className="text-xs text-fg-secondary">Hoy</span>
        </div>
      </div>
    </div>
  );
};

// ─── Subcomponente: DayDetailModal ────────────────────────────────────────────

interface DayDetailModalProps {
  selected: SelectedDay | null;
  onClose: () => void;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ selected, onClose }) => {
  const { aliases } = useAliases();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Reset al abrir un nuevo día
  useEffect(() => {
    if (selected) {
      setSearch("");
      setPage(1);
    }
  }, [selected?.dateKey]);

  const filteredWorkouts = useMemo(() => {
    if (!selected) return [];
    const term = search.trim().toLowerCase();
    if (!term) return selected.workouts;
    return selected.workouts.filter((w) => {
      const display = getDisplayName({
        id: w.student_id,
        username: w.username,
        first_name: w.first_name ?? null,
        last_name: w.last_name ?? null,
      }, aliases).toLowerCase();
      return (
        display.includes(term) ||
        w.username.toLowerCase().includes(term) ||
        (w.routine_title ?? "").toLowerCase().includes(term)
      );
    });
  }, [selected, search]);

  const totalItems = filteredWorkouts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedWorkouts = filteredWorkouts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const showSearch = (selected?.workouts.length ?? 0) > SEARCH_THRESHOLD;

  return (
    <Modal
      open={selected !== null}
      onClose={onClose}
      title={selected?.label ?? ""}
      size="sm"
    >
      {selected && selected.workouts.length === 0 ? (
        <p className="text-sm text-fg-secondary text-center py-xl">
          Sin entrenos registrados
        </p>
      ) : (
        <div className="flex flex-col gap-md">
          {showSearch && (
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Buscar por nombre..."
            />
          )}

          {search.trim() !== "" && filteredWorkouts.length === 0 ? (
            <p className="text-sm text-fg-secondary text-center py-xl">
              No encontramos resultados para esa búsqueda.
            </p>
          ) : (
            <div
              className="flex flex-col divide-y"
              style={{ borderColor: "var(--separator-subtle)" }}
            >
              {pagedWorkouts.map((item, idx) => (
                <div
                  key={`${item.student_id}-${item.routine_title}-${idx}`}
                  className="flex items-center gap-md py-md"
                >
                  <Avatar
                    src={item.avatar_url}
                    initials={getUserInitials({
                      username: item.username,
                      first_name: item.first_name ?? null,
                      last_name: item.last_name ?? null,
                    })}
                    alt={item.username}
                    size="sm"
                  />
                  <div className="flex flex-col gap-xxs flex-1 min-w-0">
                    <span className="text-sm font-semibold text-fg truncate">
                      {getDisplayName({
                        id: item.student_id,
                        username: item.username,
                        first_name: item.first_name ?? null,
                        last_name: item.last_name ?? null,
                      }, aliases)}
                    </span>
                    <div className="flex items-center gap-xs text-fg-tertiary">
                      <Dumbbell size={11} className="flex-shrink-0" />
                      <span className="text-xs truncate">
                        {item.routine_title ?? "Rutina sin nombre"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalItems > ITEMS_PER_PAGE && (
            <Pagination
              page={safePage}
              perPage={ITEMS_PER_PAGE}
              total={totalItems}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </Modal>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

interface CoachCalendarCardProps {
  className?: string;
}

export const CoachCalendarCard: React.FC<CoachCalendarCardProps> = ({
  className = "",
}) => {
  // ── Mes activo ────────────────────────────────────────────────────────────
  const today = getTodayInAR();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);

  // ── Grupo seleccionado ────────────────────────────────────────────────────
  const [groups, setGroups] = useState<TrainingGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(undefined);

  // ── Datos del calendario ──────────────────────────────────────────────────
  const [calendarDays, setCalendarDays] = useState<Record<string, CoachCalendarWorkout[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Día seleccionado ──────────────────────────────────────────────────────
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  const isAtCurrentMonth = year === today.year && month === today.month;

  // ── Cargar grupos (una sola vez) ──────────────────────────────────────────
  useEffect(() => {
    listGroups({ perPage: 100 })
      .then((res) => setGroups(res.items))
      .catch(() => {
        // Fallar silenciosamente: sin grupos no se bloquea el calendario
        setGroups([]);
      });
  }, []);

  // ── Cargar calendario ─────────────────────────────────────────────────────
  const loadCalendar = useCallback(
    async (y: number, m: number, groupId?: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCoachCalendar(getMonthKey(y, m), groupId);
        setCalendarDays(data.days ?? {});
      } catch (err) {
        setError(getErrorMessage(err, "No se pudo cargar el calendario."));
        setCalendarDays({});
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCalendar(year, month, selectedGroupId);
  }, [loadCalendar, year, month, selectedGroupId]);

  // ── Navegación de mes ─────────────────────────────────────────────────────
  const goToPrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (isAtCurrentMonth) return;
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // ── Resumen de entrenamientos del mes ─────────────────────────────────────
  const totalWorkoutsThisMonth = useMemo(
    () =>
      Object.values(calendarDays).reduce((sum, ws) => sum + ws.length, 0),
    [calendarDays]
  );

  const activeDaysThisMonth = useMemo(
    () => Object.keys(calendarDays).length,
    [calendarDays]
  );

  return (
    <div
      className={[
        "flex flex-col gap-lg p-xxl rounded-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border-light)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* ── Encabezado ── */}
      <div className="flex flex-col gap-sm">
        <div className="flex items-center justify-between gap-md flex-wrap">
          {/* Título */}
          <div className="flex items-center gap-sm">
            <CalendarDays size={18} style={{ color: "var(--flame)" }} />
            <span className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">
              Calendario
            </span>
          </div>

          {/* Filtro por grupo */}
          {groups.length > 0 && (
            <div className="flex items-center gap-xs">
              <Users size={14} className="text-fg-tertiary flex-shrink-0" />
              <select
                value={selectedGroupId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedGroupId(v === "" ? undefined : Number(v));
                }}
                className={[
                  "h-9 bg-fill-tertiary text-fg text-sm rounded-md border border-transparent",
                  "pl-md pr-xl outline-none focus:border-primary focus:bg-fill-quaternary",
                  "transition-colors duration-150 appearance-none cursor-pointer",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  // flecha nativa via background-image
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 8px center",
                  paddingRight: "28px",
                }}
                aria-label="Filtrar por grupo"
              >
                <option value="">Todos los grupos</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Navegación de mes */}
        <div className="flex items-center justify-between gap-md">
          <Button
            variant="secondary"
            size="sm"
            onClick={goToPrevMonth}
            iconLeft={<ChevronLeft size={14} />}
            aria-label="Mes anterior"
          >
            Anterior
          </Button>

          <span className="text-lg font-semibold text-fg min-w-[160px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={goToNextMonth}
            disabled={isAtCurrentMonth}
            iconRight={<ChevronRight size={14} />}
            aria-label="Mes siguiente"
          >
            Siguiente
          </Button>
        </div>
      </div>

      {/* ── Divisor ── */}
      <div
        className="h-px w-full"
        style={{ background: "var(--separator-subtle)" }}
      />

      {/* ── Contenido ── */}
      {error ? (
        <ErrorBanner message={error} dismissible />
      ) : !loading && activeDaysThisMonth === 0 ? (
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="Sin entrenamientos"
          description="Ningún alumno entrenó este mes."
        />
      ) : (
        <>
          <CalendarGrid
            year={year}
            month={month}
            loading={loading}
            days={calendarDays}
            onDayClick={setSelectedDay}
          />

          {/* Mini resumen del mes (solo cuando hay datos) */}
          {!loading && activeDaysThisMonth > 0 && (
            <div
              className="flex items-center justify-center gap-xl pt-sm"
              style={{ borderTop: "1px solid var(--separator-subtle)" }}
            >
              <div className="flex flex-col items-center gap-xxs">
                <span
                  className="text-xl font-bold"
                  style={{ color: "var(--flame)" }}
                >
                  {totalWorkoutsThisMonth}
                </span>
                <span className="text-xs text-fg-tertiary">entrenos</span>
              </div>
              <div
                className="w-px h-8 self-center"
                style={{ background: "var(--separator-subtle)" }}
              />
              <div className="flex flex-col items-center gap-xxs">
                <span
                  className="text-xl font-bold"
                  style={{ color: "var(--primary)" }}
                >
                  {activeDaysThisMonth}
                </span>
                <span className="text-xs text-fg-tertiary">días activos</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal de día ── */}
      <DayDetailModal
        selected={selectedDay}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
};
