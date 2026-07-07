"use client";

import React from "react";
import Link from "next/link";
import { Dumbbell, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Routine, DayOfWeek } from "@/lib/api/types";

interface RoutineRowProps {
  routine: Routine;
  href: string;
  isLast: boolean;
}

/** Alto fijo de fila (px) — todas las filas miden lo mismo. */
export const ROW_HEIGHT = 68;


const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

export function formatDays(dayOfWeek: DayOfWeek | DayOfWeek[] | null | undefined): string {
  if (!dayOfWeek) return "";
  const days = Array.isArray(dayOfWeek) ? dayOfWeek : [dayOfWeek];
  if (days.length === 0) return "";
  return days.map((d) => DAY_LABELS[d] ?? d).join("/");
}

export function formatRelativeDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 14) return "Hace 1 semana";
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return `Hace ${Math.floor(diffDays / 30)} ${Math.floor(diffDays / 30) === 1 ? "mes" : "meses"}`;
}

/**
 * RoutineRow — fila compacta de rutina para la lista /routines.
 * Sigue el mismo patrón visual que StudentRow en /students.
 */
export const RoutineRow: React.FC<RoutineRowProps> = ({ routine, href, isLast }) => {
  const exerciseCount = routine.exercises?.length ?? 0;
  const dayStr = formatDays(routine.day_of_week);
  const assignedCount =
    (routine.shares ?? []).filter((s) => s.status === "active").length;
  const lastEdited = formatRelativeDate(routine.updated_at ?? routine.createdAt);

  return (
    <div
      className="flex items-center gap-md px-xl transition-colors duration-100 hover:bg-fill-tertiary"
      style={{
        minHeight: ROW_HEIGHT,
        ...(isLast ? {} : { borderBottom: "1px solid var(--separator-subtle)" }),
      }}
    >
      {/* Ícono de rutina */}
      <div
        className="w-10 h-10 rounded-pill flex items-center justify-center flex-shrink-0"
        style={{
          background: "var(--primary-alpha-12)",
          color: "var(--primary)",
        }}
      >
        <Dumbbell size={18} />
      </div>

      {/* Info central */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg m-0 truncate">{routine.title}</p>
        <div className="mt-xxs flex items-center gap-xs flex-wrap">
          {exerciseCount > 0 && (
            <Badge variant="neutral" size="sm">
              {exerciseCount} {exerciseCount === 1 ? "ejercicio" : "ejercicios"}
            </Badge>
          )}
          {dayStr && (
            <Badge variant="neutral" size="sm">
              {dayStr}
            </Badge>
          )}
          {assignedCount > 0 && (
            <Badge variant="success" size="sm">
              {assignedCount} {assignedCount === 1 ? "alumno" : "alumnos"}
            </Badge>
          )}
          {lastEdited && (
            <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
              {lastEdited}
            </span>
          )}
        </div>
      </div>

      {/* Acción */}
      <Link href={href} className="no-underline flex-shrink-0">
        <Button variant="secondary" size="sm" iconRight={<ChevronRight size={14} />}>
          Ver rutina
        </Button>
      </Link>
    </div>
  );
};

