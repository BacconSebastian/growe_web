"use client";

import React from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Planning, DayOfWeek } from "@/lib/api/types";

const DAY_ORDER: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

interface PlanningRowProps {
  planning: Planning;
  href: string;
  isLast: boolean;
}

/** Alto fijo de fila (px) — todas las filas miden lo mismo. */
export const ROW_HEIGHT = 68;


/**
 * PlanningRow — fila compacta de planificación para la lista /plannings.
 * Sigue el mismo patrón visual que StudentRow en /students.
 */
export const PlanningRow: React.FC<PlanningRowProps> = ({ planning, href, isLast }) => {
  // Los datos se derivan de la PRIMERA semana
  const firstWeek = planning.weeks?.[0];
  const weekRoutines = firstWeek?.routines ?? [];
  const routineCount = weekRoutines.length;
  const totalWeeks = planning.weeks?.length ?? planning.total_weeks ?? 0;

  // Días asignados (distintos) en la primera semana, en orden canónico
  const daySet = new Set<string>();
  for (const wr of weekRoutines) {
    if (wr.day_of_week) {
      daySet.add(wr.day_of_week);
    } else if (Array.isArray(wr.routine_day_of_week)) {
      (wr.routine_day_of_week as string[]).forEach((d) => daySet.add(d));
    }
  }
  const daysCount = DAY_ORDER.filter((d) => daySet.has(d)).length;

  const assignedCount = (planning.planningShares ?? []).filter(
    (s) => s.status === "active"
  ).length;

  // Fecha de inicio programada
  let startDateLabel = "";
  if (planning.status === "scheduled" && planning.start_date) {
    startDateLabel = `Inicia ${new Date(planning.start_date).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
    })}`;
  }

  return (
    <div
      className="flex items-center gap-md px-xl transition-colors duration-100 hover:bg-fill-tertiary"
      style={{
        minHeight: ROW_HEIGHT,
        ...(isLast ? {} : { borderBottom: "1px solid var(--separator-subtle)" }),
      }}
    >
      {/* Ícono de planificación */}
      <div
        className="w-10 h-10 rounded-pill flex items-center justify-center flex-shrink-0"
        style={{
          background: "var(--primary-alpha-12)",
          color: "var(--primary)",
        }}
      >
        <CalendarDays size={18} />
      </div>

      {/* Info central */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg m-0 truncate">{planning.title}</p>
        <div className="mt-xxs flex items-center gap-xs flex-wrap">
          {totalWeeks > 0 && (
            <Badge variant="neutral" size="sm">
              {totalWeeks} {totalWeeks === 1 ? "semana" : "semanas"}
            </Badge>
          )}
          {daysCount > 0 && (
            <Badge variant="neutral" size="sm">
              {daysCount} {daysCount === 1 ? "día" : "días"}/sem
            </Badge>
          )}
          {routineCount > 0 && (
            <Badge variant="neutral" size="sm">
              {routineCount} {routineCount === 1 ? "rutina" : "rutinas"}
            </Badge>
          )}
          {assignedCount > 0 && (
            <Badge variant="success" size="sm">
              {assignedCount} {assignedCount === 1 ? "alumno" : "alumnos"}
            </Badge>
          )}
          {startDateLabel && (
            <Badge variant="warning" size="sm">
              {startDateLabel}
            </Badge>
          )}
        </div>
      </div>

      {/* Acción */}
      <Link href={href} className="no-underline flex-shrink-0">
        <Button variant="secondary" size="sm" iconRight={<ChevronRight size={14} />}>
          Ver planificación
        </Button>
      </Link>
    </div>
  );
};

