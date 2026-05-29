"use client";

import React from "react";
import { WeekCell } from "./WeekCell";
import type { Routine } from "@/lib/api/types";

// Tipos exportados para el editor
export type CellKey = `${number}-${number}`; // `week-dayIndex`

export interface RoutineAssignment {
  routineId: number | null; // null = descanso
}

interface PlanningGridProps {
  totalWeeks: number;
  /** Mapa { "week-dayIndex": routineId | null }. null = descanso, undefined = sin asignar = descanso */
  assignments: Record<CellKey, number | null>;
  /** Rutinas disponibles indexadas por id */
  routinesById: Record<number, Routine>;
  /** Semana resaltada (1-indexed) */
  currentWeek: number;
  /** Semana seleccionada (para resaltar fila) */
  selectedWeek: number;
  readOnly?: boolean;
  onCellClick?: (week: number, dayIndex: number) => void;
  onSelectWeek?: (week: number) => void;
}

const DAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const PlanningGrid: React.FC<PlanningGridProps> = ({
  totalWeeks,
  assignments,
  routinesById,
  currentWeek,
  selectedWeek,
  readOnly = false,
  onCellClick,
  onSelectWeek,
}) => {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-md)",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "64px repeat(7, minmax(80px, 1fr))",
          gap: "var(--space-xs)",
          minWidth: "640px",
        }}
      >
        {/* Header row */}
        <div />
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: "var(--font-xxs)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--fg-tertiary)",
              padding: "var(--space-xs) 0",
              fontWeight: "var(--weight-semibold)",
            }}
          >
            {d}
          </div>
        ))}

        {/* Week rows */}
        {weeks.map((week) => {
          const isCurrentWeekRow = week === currentWeek;
          const isSelectedWeekRow = week === selectedWeek;

          return (
            <React.Fragment key={week}>
              {/* Week label */}
              <div
                className={[
                  "flex items-center justify-center font-bold rounded-sm transition-colors",
                  !readOnly ? "cursor-pointer hover:bg-fill-tertiary" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  fontSize: "var(--font-sm)",
                  color: isCurrentWeekRow ? "var(--primary)" : "var(--fg-secondary)",
                  fontWeight: isSelectedWeekRow ? 700 : undefined,
                  background: isSelectedWeekRow ? "var(--primary-alpha-08)" : undefined,
                  borderRadius: "var(--radius-sm)",
                }}
                onClick={() => onSelectWeek?.(week)}
                title={`Semana ${week}`}
              >
                S{week}
              </div>

              {/* 7 cells */}
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const key: CellKey = `${week}-${dayIndex}`;
                const routineId = assignments[key];
                const isRest = routineId === null || routineId === undefined;
                const routine = routineId != null ? routinesById[routineId] : undefined;
                const isDeleted = routineId != null && !routine;

                return (
                  <WeekCell
                    key={dayIndex}
                    routine={routine}
                    isRest={!isDeleted && isRest}
                    isCurrentWeek={isCurrentWeekRow}
                    isDeleted={isDeleted}
                    readOnly={readOnly}
                    onClick={() => onCellClick?.(week, dayIndex)}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
