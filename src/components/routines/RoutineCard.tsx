"use client";

import React from "react";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Routine, DayOfWeek } from "@/lib/api/types";

interface RoutineCardProps {
  routine: Routine;
  href: string;
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

function formatDays(dayOfWeek: DayOfWeek | DayOfWeek[] | null | undefined): string {
  if (!dayOfWeek) return "";
  const days = Array.isArray(dayOfWeek) ? dayOfWeek : [dayOfWeek];
  if (days.length === 0) return "";
  return days.map((d) => DAY_LABELS[d] ?? d).join("/");
}

function formatRelativeDate(dateStr: string | undefined): string {
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
 * RoutineCard — card de rutina para la lista /routines.
 * Usa Card variant="gradient" del design system.
 */
export const RoutineCard: React.FC<RoutineCardProps> = ({ routine, href }) => {
  const exerciseCount = routine.exercises?.length ?? 0;
  const dayStr = formatDays(routine.day_of_week);
  const assignedCount =
    (routine.shares ?? []).filter((s) => s.status === "active").length;
  const lastEdited = formatRelativeDate(routine.updated_at ?? routine.createdAt);

  return (
    <Link href={href} className="block group" style={{ textDecoration: "none", color: "inherit" }}>
      {/* Replicamos el Card gradient manualmente para poder usar <Link> */}
      <div
        className="relative rounded-lg overflow-hidden border transition-transform group-hover:-translate-y-px"
        style={{
          background: "var(--card)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Overlay gradiente */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
          }}
        />

        <div className="relative p-xl flex flex-col gap-md">
          {/* Header: ícono + badge asignados */}
          <div className="flex items-start justify-between gap-md">
            <div
              className="w-10 h-10 rounded-pill flex items-center justify-center flex-shrink-0"
              style={{
                background: "var(--primary-alpha-12)",
                color: "var(--primary)",
              }}
            >
              <Dumbbell size={18} />
            </div>

            {assignedCount > 0 ? (
              <Badge variant="success" size="sm">
                {assignedCount} {assignedCount === 1 ? "alumno" : "alumnos"}
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                Sin asignar
              </Badge>
            )}
          </div>

          {/* Nombre */}
          <div>
            <h3
              className="text-base font-semibold text-fg m-0 leading-tight line-clamp-2"
              style={{ wordBreak: "break-word" }}
            >
              {routine.title}
            </h3>
          </div>

          {/* Detalles */}
          <p className="text-sm text-fg-secondary m-0">
            {exerciseCount > 0 && (
              <>{exerciseCount} {exerciseCount === 1 ? "ejercicio" : "ejercicios"}</>
            )}
            {exerciseCount > 0 && dayStr && " · "}
            {dayStr}
          </p>

          {/* Fecha */}
          {lastEdited && (
            <p className="text-xs text-fg-tertiary m-0">{lastEdited}</p>
          )}
        </div>
      </div>
    </Link>
  );
};
