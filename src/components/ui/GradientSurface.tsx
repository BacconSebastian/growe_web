"use client";

import React from "react";

interface GradientSurfaceProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * GradientSurface — contenedor base con el gradiente característico ámbar→primary
 * de la app (mismo look que las cards de mobile).
 *
 * - overflow-hidden + border-radius-lg
 * - Borde sutil (--separator-subtle)
 * - Sombra card
 * - Overlay de gradiente diagonal (posición absoluta, pointer-events none)
 * - Sin padding propio — el contenido maneja su spacing internamente.
 *
 * Usar en lugar de div con background: var(--card) cuando se quiera el look
 * gradient de la app. Reemplaza el patrón inline repetido en el dashboard.
 */
export const GradientSurface: React.FC<GradientSurfaceProps> = ({
  children,
  className = "",
  style,
  onClick,
}) => {
  return (
    <div
      className={["relative flex flex-col rounded-lg overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        border: "1px solid var(--separator-subtle)",
        boxShadow: "var(--shadow-card)",
        ...style,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }
          : undefined
      }
    >
      {/* Overlay de gradiente diagonal ámbar → primary */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
        }}
      />
      {/* Contenido siempre por encima del overlay */}
      <div className="relative flex flex-col flex-1">{children}</div>
    </div>
  );
};
