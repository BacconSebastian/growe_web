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
 * DayBadge — pill con color por día de la semana.
 * Usa CSS vars --day-mon ... --day-sun para el fondo.
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
        background: `var(--day-${day})`,
        color: "var(--fg)",
      }}
      title={DAY_LABELS[day]}
    >
      {children}
    </span>
  );
};
