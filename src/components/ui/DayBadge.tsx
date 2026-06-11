"use client";

import React from "react";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface DayBadgeProps {
  day: DayKey;
  children: React.ReactNode;
  className?: string;
}

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mié",
  thu: "Jue",
  fri: "Vie",
  sat: "Sáb",
  sun: "Dom",
};

/**
 * DayBadge — pill de día de la semana.
 * Todos los días comparten el mismo color (--day-mon) para evitar el efecto
 * "arcoíris"; el `day` solo determina el label/title.
 */
export const DayBadge: React.FC<DayBadgeProps> = ({
  day,
  children,
  className = "",
}) => {
  return (
    <span
      className={[
        "inline-flex items-center rounded-pill px-md py-xs",
        "text-xs font-semibold whitespace-nowrap",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "var(--day-mon)",
        color: "var(--fg)",
      }}
      title={DAY_LABELS[day]}
    >
      {children}
    </span>
  );
};
