"use client";

/**
 * RoutineDayCard.tsx
 *
 * Card presentacional de una rutina asignada a un día del calendario semanal.
 * Reusada en:
 *  - PlanningWeekDetail (editable): clickeable + acciones copiar/pegar en hover.
 *  - PlanningOverview / WeekCalendarReadonly (solo lectura): sin click ni acciones.
 *
 * El área de "ejercicios · series" se intercambia por `metaOverlay` (botones) al
 * hacer hover SOLO cuando se pasa `metaOverlay`. El contador queda en flujo
 * (opacity-0) para que la card no cambie de tamaño.
 */

import React from "react";

// ─── IconButton — botón de acción frosted (copiar/pegar) ──────────────────────

export const IconButton: React.FC<{
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ title, onClick, children, disabled = false }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
    className="inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all duration-150 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
    style={{
      background: "var(--fill-secondary)",
      border: "1px solid var(--card-border-light)",
      color: "var(--fg)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      const el = e.currentTarget as HTMLButtonElement;
      el.style.background = "var(--on-primary)";
      el.style.color = "var(--primary)";
      el.style.borderColor = "transparent";
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget as HTMLButtonElement;
      el.style.background = "var(--fill-secondary)";
      el.style.color = "var(--fg)";
      el.style.borderColor = "var(--card-border-light)";
    }}
  >
    {children}
  </button>
);

export interface RoutineDayCardProps {
  title: string;
  exercises: number;
  sets: number;
  /** Resalta la card con borde primary (rutina seleccionada en el editor). */
  selected?: boolean;
  /** Si se pasa, la card es clickeable (cursor + hover). */
  onClick?: () => void;
  /** Tooltip nativo. */
  titleAttr?: string;
  /**
   * Contenido (típicamente botones de acción) que reemplaza al contador
   * "ejercicios · series" al hacer hover. Si es undefined, la card es estática.
   */
  metaOverlay?: React.ReactNode;
}

export const RoutineDayCard: React.FC<RoutineDayCardProps> = ({
  title,
  exercises,
  sets,
  selected = false,
  onClick,
  titleAttr,
  metaOverlay,
}) => {
  const interactive = typeof onClick === "function";

  return (
    <div
      {...(interactive
        ? {
            role: "button",
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            },
          }
        : {})}
      className={`${
        metaOverlay ? "group " : ""
      }w-full flex flex-col items-center justify-center gap-xs rounded-lg px-xs py-md text-center${
        interactive ? " cursor-pointer transition-opacity hover:opacity-95" : ""
      }`}
      style={{
        minHeight: "84px",
        background:
          "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
        border: selected
          ? "2px solid var(--primary)"
          : "1px solid var(--card-border-light)",
      }}
      title={titleAttr}
    >
      <span
        className="text-xs font-semibold leading-tight"
        style={{ color: "var(--fg)" }}
      >
        {title}
      </span>

      {/* Área del contador (↔ acciones en hover si hay metaOverlay) */}
      <div className="relative w-full mt-sm">
        <span
          className={`block text-xxs leading-tight${
            metaOverlay ? " transition-opacity duration-150 group-hover:opacity-0" : ""
          }`}
          style={{ color: "var(--fg-tertiary)" }}
        >
          {exercises} {exercises === 1 ? "ejercicio" : "ejercicios"}
          {" · "}
          {sets} {sets === 1 ? "serie" : "series"}
        </span>
        {metaOverlay && (
          <div className="absolute inset-0 flex items-center justify-center gap-sm opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto">
            {metaOverlay}
          </div>
        )}
      </div>
    </div>
  );
};
