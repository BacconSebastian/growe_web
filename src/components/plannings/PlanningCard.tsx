"use client";

import React from "react";
import Link from "next/link";
import { DayBadge } from "@/components/ui/DayBadge";
import { PlanningStatusBadge } from "./PlanningStatusBadge";
import type { Planning, DayOfWeek } from "@/lib/api/types";

// Mapeo DayOfWeek → clave de DayBadge
const DOW_TO_KEY: Record<DayOfWeek, "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"> = {
  monday:    "mon",
  tuesday:   "tue",
  wednesday: "wed",
  thursday:  "thu",
  friday:    "fri",
  saturday:  "sat",
  sunday:    "sun",
};

const DOW_LABEL: Record<DayOfWeek, string> = {
  monday:    "Lun",
  tuesday:   "Mar",
  wednesday: "Mié",
  thursday:  "Jue",
  friday:    "Vie",
  saturday:  "Sáb",
  sunday:    "Dom",
};

interface PlanningCardProps {
  planning: Planning;
  href: string;
}

export const PlanningCard: React.FC<PlanningCardProps> = ({ planning, href }) => {
  const routineCount = planning.routines?.length ?? 0;
  const assignedCount = (planning.planningShares ?? []).filter((s) => s.status === "active").length;

  const days: DayOfWeek[] = Array.isArray(planning.target_days)
    ? planning.target_days
    : [];

  return (
    <Link
      href={href}
      className="block text-inherit no-underline rounded-lg transition-opacity hover:opacity-90"
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Overlay gradiente sutil */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
          }}
        />

        <div className="relative p-xl flex flex-col gap-md">
          {/* Header: nombre + badge */}
          <div className="flex items-start justify-between gap-md">
            <div className="min-w-0">
              <h3
                className="text-base font-semibold text-fg m-0 truncate"
                title={planning.title}
              >
                {planning.title}
              </h3>
              <p className="text-sm text-fg-secondary m-0 mt-xs">
                {planning.total_weeks} sem · {planning.target_days?.length ?? 0} días/sem
              </p>
            </div>
            <PlanningStatusBadge status={planning.status} />
          </div>

          {/* Stats */}
          <div className="flex gap-lg flex-wrap">
            <div>
              <p className="text-xxs text-fg-tertiary uppercase tracking-wide m-0">Duración</p>
              <p className="text-sm font-semibold text-fg m-0">{planning.total_weeks} semanas</p>
            </div>
            <div>
              <p className="text-xxs text-fg-tertiary uppercase tracking-wide m-0">Asignada a</p>
              <p className="text-sm font-semibold text-fg m-0">
                {assignedCount > 0 ? `${assignedCount} alumno${assignedCount !== 1 ? "s" : ""}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xxs text-fg-tertiary uppercase tracking-wide m-0">Rutinas</p>
              <p className="text-sm font-semibold text-fg m-0">{routineCount}</p>
            </div>
            {planning.status === "scheduled" && planning.start_date && (
              <div>
                <p className="text-xxs text-fg-tertiary uppercase tracking-wide m-0">Inicio</p>
                <p className="text-sm font-semibold text-fg m-0">
                  {new Date(planning.start_date).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Day badges */}
          {days.length > 0 && (
            <div className="flex gap-xs flex-wrap">
              {days.map((dow) => (
                <DayBadge key={dow} day={DOW_TO_KEY[dow]}>
                  {DOW_LABEL[dow]}
                </DayBadge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
