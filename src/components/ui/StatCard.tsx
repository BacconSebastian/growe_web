"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { GradientSurface } from "./GradientSurface";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: {
    text: string;
    dir: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  /** Clase de color para el ícono (ej: "text-primary", "text-success") */
  iconColorClass?: string;
  className?: string;
  /** Si se pasa, la card es clickeable (cursor + elevación al hover + foco accesible). */
  onClick?: () => void;
}

/**
 * StatCard — card de métrica con gradiente característico de la app.
 *
 * Layout (espejo de mobile MetricsGrid):
 *   - Fila superior: [badge ícono 34x34] + [valor grande]
 *   - Debajo: label en texto pequeño terciario
 *   - Delta opcional al lado del valor
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  icon,
  iconColorClass = "text-primary",
  className = "",
  onClick,
}) => {
  // Derivar el color de fondo del badge a partir de iconColorClass
  // Mapea la clase de color al token alpha correspondiente
  const iconBgMap: Record<string, string> = {
    "text-primary": "var(--primary-alpha-20)",
    "text-success": "var(--success-alpha-20)",
    "text-warning": "var(--warning-alpha-20)",
    "text-destructive": "var(--warning-alpha-20)",
    "text-purple": "var(--purple-alpha-16)",
    "text-accent": "var(--accent-alpha-20)",
    "text-teal": "var(--primary-alpha-16)",
  };

  const iconBg = iconBgMap[iconColorClass] ?? "var(--fill-tertiary)";

  return (
    <GradientSurface
      onClick={onClick}
      className={[
        className,
        onClick
          ? "cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 hover:border-[var(--separator)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-sm p-xl">
        {/* Fila superior: badge de ícono + valor */}
        <div className="flex items-center gap-md">
          {icon && (
            <div
              className={[
                "w-[34px] h-[34px] rounded-pill flex items-center justify-center flex-shrink-0",
                iconColorClass,
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ background: iconBg }}
            >
              {icon}
            </div>
          )}

          <div className="flex items-end gap-sm flex-wrap leading-none">
            <span
              className="font-extrabold text-fg leading-none"
              style={{ fontSize: "26px", letterSpacing: "-0.5px" }}
            >
              {value}
            </span>

            {delta && (
              <span
                className="flex items-center gap-xxs text-sm font-medium pb-xs"
                style={{
                  color:
                    delta.dir === "up"
                      ? "var(--success)"
                      : delta.dir === "down"
                      ? "var(--destructive)"
                      : "var(--fg-secondary)",
                }}
              >
                {delta.dir === "up" && <TrendingUp size={13} />}
                {delta.dir === "down" && <TrendingDown size={13} />}
                {delta.text}
              </span>
            )}
          </div>
        </div>

        {/* Label debajo */}
        <span
          className="text-xs font-medium text-fg-tertiary leading-snug"
        >
          {label}
        </span>
      </div>
    </GradientSurface>
  );
};
