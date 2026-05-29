"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

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
}

/**
 * StatCard — card de métrica con label, value, delta opcional e ícono.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  icon,
  iconColorClass = "text-primary",
  className = "",
}) => {
  return (
    <div
      className={[
        "flex flex-col gap-sm p-xl rounded-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-start justify-between gap-sm">
        <span className="text-sm text-fg-secondary font-medium">{label}</span>
        {icon && (
          <div
            className={[
              "w-9 h-9 rounded-pill flex items-center justify-center flex-shrink-0",
              iconColorClass,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ background: "var(--fill-tertiary)" }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end gap-sm flex-wrap">
        <span className="text-display font-bold text-fg leading-none">
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
  );
};
