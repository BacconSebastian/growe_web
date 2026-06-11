"use client";

import React from "react";
import Link from "next/link";
import { DayBadge } from "@/components/ui/DayBadge";
import type { Planning, DayOfWeek } from "@/lib/api/types";

// Mapeo DayOfWeek → clave de DayBadge
const DOW_TO_KEY: Record<DayOfWeek, "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
};

const DOW_LABEL: Record<DayOfWeek, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

interface PlanningCardProps {
  planning: Planning;
  href: string;
}

/** Alto fijo de la card (px) — mismo alto que ROUTINE_CARD_HEIGHT. */
export const PLANNING_CARD_HEIGHT = 176;

const DAY_ORDER: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const PlanningCard: React.FC<PlanningCardProps> = ({ planning, href }) => {
  // Los datos se derivan de la PRIMERA semana (el listado trae weeks[].routines,
  // no un planning.routines a nivel raíz).
  const firstWeek = planning.weeks?.[0];
  const weekRoutines = firstWeek?.routines ?? [];
  const routineCount = weekRoutines.length;

  // Días asignados (distintos) en la primera semana, en orden canónico.
  const daySet = new Set<string>();
  for (const wr of weekRoutines) {
    if (wr.day_of_week) {
      daySet.add(wr.day_of_week);
    } else if (Array.isArray(wr.routine_day_of_week)) {
      wr.routine_day_of_week.forEach((d) => daySet.add(d));
    }
  }
  const days: DayOfWeek[] = DAY_ORDER.filter((d) => daySet.has(d));

  const assignedCount = (planning.planningShares ?? []).filter(
    (s) => s.status === "active"
  ).length;

  const metaParts = [
    `${planning.total_weeks} sem`,
    `${days.length} días/sem`,
    `${routineCount} rutina${routineCount !== 1 ? "s" : ""}`,
  ];
  if (assignedCount > 0) {
    metaParts.push(`${assignedCount} alumno${assignedCount !== 1 ? "s" : ""}`);
  }
  if (planning.status === "scheduled" && planning.start_date) {
    metaParts.push(
      `inicia ${new Date(planning.start_date).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
      })}`
    );
  }

  return (
    <Link
      href={href}
      className="block group text-inherit no-underline"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        className="relative rounded-lg overflow-hidden border transition-transform group-hover:-translate-y-px"
        style={{
          height: PLANNING_CARD_HEIGHT,
          borderColor: "var(--card-border-light)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Overlay gradiente característico */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
          }}
        />

        <div className="relative p-xl flex flex-col h-full">
          {/* Título */}
          <h3
            className="text-base font-semibold text-fg m-0 leading-tight line-clamp-2"
            style={{ wordBreak: "break-word" }}
          >
            {planning.title}
          </h3>

          {/* Footer: meta + días (siempre al pie) */}
          <div className="mt-auto flex flex-col gap-sm">
            <p className="text-sm text-fg-secondary m-0 truncate">
              {metaParts.join(" · ")}
            </p>
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
      </div>
    </Link>
  );
};
