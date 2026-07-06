"use client";

import React from "react";

interface TooltipProps {
  /** Texto del tooltip. */
  label: string;
  children: React.ReactNode;
  /** Clases extra para el wrapper (ej. para que ocupe el ancho del hijo). */
  className?: string;
}

/**
 * Tooltip CSS liviano — aparece arriba del contenido al hacer hover.
 * Usa un grupo nombrado (`group/tip`) para no chocar con otros `group` padres.
 * El hover vive en el wrapper, así también funciona sobre botones disabled.
 */
export const Tooltip: React.FC<TooltipProps> = ({ label, children, className = "" }) => (
  <span className={`relative inline-flex group/tip ${className}`}>
    {children}
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 px-3 py-1.5 rounded-md text-xxs leading-tight whitespace-nowrap text-center opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100"
      style={{
        background: "var(--bg-elevated)",
        color: "var(--fg)",
        border: "1px solid var(--card-border-light)",
        boxShadow: "0 4px 12px var(--overlay-medium)",
      }}
    >
      {label}
    </span>
  </span>
);
