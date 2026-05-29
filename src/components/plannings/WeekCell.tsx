"use client";

import React from "react";
import type { Routine } from "@/lib/api/types";

interface WeekCellProps {
  routine: Routine | null | undefined;
  /** true si la celda no tiene rutina asignada (solo descanso) */
  isRest: boolean;
  /** true si pertenece a la semana resaltada actual */
  isCurrentWeek: boolean;
  /** true si la rutina fue eliminada (id existe pero no se encontró la rutina) */
  isDeleted?: boolean;
  readOnly?: boolean;
  onClick?: () => void;
}

export const WeekCell: React.FC<WeekCellProps> = ({
  routine,
  isRest,
  isCurrentWeek,
  isDeleted,
  readOnly = false,
  onClick,
}) => {
  const exerciseCount = routine?.exercises?.length ?? routine?.current_week_exercise_count ?? null;

  if (isRest || (!routine && !isDeleted)) {
    return (
      <div
        className={[
          "rounded-sm flex items-center justify-center transition-colors",
          !readOnly ? "cursor-pointer" : "cursor-default",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          minHeight: "72px",
          padding: "var(--space-sm)",
          border: "1px dashed var(--separator)",
          color: "var(--fg-tertiary)",
          fontSize: "var(--font-xxs)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
        onClick={!readOnly ? onClick : undefined}
        role={!readOnly ? "button" : undefined}
        tabIndex={!readOnly ? 0 : undefined}
        onKeyDown={!readOnly && onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      >
        Descanso
      </div>
    );
  }

  if (isDeleted) {
    return (
      <div
        className="rounded-sm flex items-center justify-center"
        style={{
          minHeight: "72px",
          padding: "var(--space-sm)",
          background: "var(--fill-quaternary)",
          opacity: 0.5,
          fontSize: "var(--font-xxs)",
          color: "var(--fg-tertiary)",
          fontStyle: "italic",
        }}
      >
        (rutina eliminada)
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-sm flex flex-col gap-xxs transition-colors",
        !readOnly ? "cursor-pointer hover:bg-fill-tertiary" : "cursor-default",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        minHeight: "72px",
        padding: "var(--space-sm)",
        background: "var(--fill-quaternary)",
        boxShadow: isCurrentWeek ? "0 0 0 2px var(--primary)" : undefined,
      }}
      onClick={!readOnly ? onClick : undefined}
      role={!readOnly ? "button" : undefined}
      tabIndex={!readOnly ? 0 : undefined}
      onKeyDown={!readOnly && onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <span
        className="text-fg font-semibold truncate"
        style={{ fontSize: "var(--font-sm)" }}
        title={routine?.title}
      >
        {routine?.title}
      </span>
      {exerciseCount !== null && (
        <span
          className="text-fg-secondary"
          style={{ fontSize: "var(--font-xxs)" }}
        >
          {exerciseCount} ejercicio{exerciseCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
};
