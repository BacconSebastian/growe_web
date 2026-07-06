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
import { Loader2 } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

// ─── IconButton — botón de acción frosted (copiar/pegar) ──────────────────────

export const IconButton: React.FC<{
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  disabled?: boolean;
  /** Variante destructiva: ícono rojo + pop rojo en hover. */
  destructive?: boolean;
  /** Mantiene el look de hover de forma persistente (ej. botón "copiado"). */
  active?: boolean;
}> = ({ title, onClick, children, disabled = false, destructive = false, active = false }) => {
  const baseColor = destructive ? "var(--destructive)" : "var(--fg)";
  const hoverBg = destructive ? "var(--destructive)" : "var(--on-primary)";
  const hoverColor = destructive ? "var(--on-destructive)" : "var(--primary)";

  // Estilo en reposo: si está "active", usa el look de hover.
  const restBg = active ? hoverBg : "var(--fill-secondary)";
  const restColor = active ? hoverColor : baseColor;
  const restBorder = active ? "transparent" : "var(--card-border-light)";

  return (
    <Tooltip label={title}>
      <button
        type="button"
        aria-label={title}
        disabled={disabled}
        onClick={onClick}
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all duration-150 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        style={{
          background: restBg,
          border: `1px solid ${restBorder}`,
          color: restColor,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onMouseEnter={(e) => {
          if (disabled) return;
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = hoverBg;
          el.style.color = hoverColor;
          el.style.borderColor = "transparent";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = restBg;
          el.style.color = restColor;
          el.style.borderColor = restBorder;
        }}
      >
        {children}
      </button>
    </Tooltip>
  );
};

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
  /** Muestra un overlay de carga dentro de la card (ej. mientras se pega). */
  loading?: boolean;
  /**
   * Mantiene el `metaOverlay` (botones) visible de forma permanente, sin necesidad
   * de hover. Se usa para la rutina copiada.
   */
  metaAlwaysVisible?: boolean;
}

export const RoutineDayCard: React.FC<RoutineDayCardProps> = ({
  title,
  exercises,
  sets,
  selected = false,
  onClick,
  titleAttr,
  metaOverlay,
  loading = false,
  metaAlwaysVisible = false,
}) => {
  const interactive = typeof onClick === "function" && !loading;

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
        metaOverlay && !loading ? "group " : ""
      }relative w-full flex flex-col items-center justify-center gap-xs rounded-lg px-xs py-md text-center${
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
            metaOverlay
              ? metaAlwaysVisible
                ? " opacity-0"
                : " transition-opacity duration-150 group-hover:opacity-0"
              : ""
          }`}
          style={{ color: "var(--fg-tertiary)" }}
        >
          {exercises} {exercises === 1 ? "ejercicio" : "ejercicios"}
          {" · "}
          {sets} {sets === 1 ? "serie" : "series"}
        </span>
        {metaOverlay && !loading && (
          <div
            className={`absolute inset-0 flex items-center justify-center gap-xs transition-opacity duration-150 ${
              metaAlwaysVisible
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
            }`}
          >
            {metaOverlay}
          </div>
        )}
      </div>

      {/* Overlay de carga (pegando) */}
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg"
          style={{ background: "var(--overlay-medium)" }}
        >
          <Loader2 className="animate-spin" size={20} style={{ color: "var(--fg)" }} />
        </div>
      )}
    </div>
  );
};
