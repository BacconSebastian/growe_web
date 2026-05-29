"use client";

import React from "react";
import type { ConsistencyHeatmapDay } from "@/lib/api/types";

interface HeatmapGridProps {
  days: ConsistencyHeatmapDay[];
}

const LEVEL_STYLES: Record<number, React.CSSProperties> = {
  0: { background: "var(--fill-quaternary)" },
  1: { background: "var(--heatmap-1, rgba(10,132,255,0.2))" },
  2: { background: "var(--heatmap-2, rgba(10,132,255,0.4))" },
  3: { background: "var(--heatmap-3, rgba(10,132,255,0.65))" },
  4: { background: "var(--heatmap-4, rgba(10,132,255,0.9))" },
};

const WEEK_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleString("es-AR", { month: "short" });
}

/**
 * HeatmapGrid — grilla de ~14 semanas × 7 días con niveles 0-4.
 * Similar al heatmap de GitHub/mobile.
 */
export const HeatmapGrid: React.FC<HeatmapGridProps> = ({ days }) => {
  if (!days || days.length === 0) {
    return (
      <div className="text-sm text-fg-secondary py-sm">
        Sin datos de consistencia
      </div>
    );
  }

  // Agrupar por semana (Sunday-first)
  const weeks: ConsistencyHeatmapDay[][] = [];
  let currentWeek: ConsistencyHeatmapDay[] = [];

  const sorted = [...days].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Pad start to align with day of week
  if (sorted.length > 0) {
    const firstDay = new Date(sorted[0].date + "T00:00:00");
    const dayOfWeek = firstDay.getDay(); // 0=Sun
    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push({ date: "", trained: false, volume_kg: 0, set_count: 0, level: 0, workouts: [] });
    }
  }

  for (const day of sorted) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: "", trained: false, volume_kg: 0, set_count: 0, level: 0, workouts: [] });
    }
    weeks.push(currentWeek);
  }

  return (
    <div className="flex flex-col gap-xs overflow-x-auto">
      {/* Day labels */}
      <div className="flex gap-xxs">
        {/* spacer for week col */}
        <div className="w-0 flex-shrink-0" />
        {WEEK_LABELS.map((label) => (
          <div
            key={label}
            className="text-xxs text-fg-tertiary text-center"
            style={{ width: 12, flexShrink: 0 }}
          >
            {label[0]}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-xxs">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-xxs items-center">
            {/* Month label on first week of month */}
            <div
              className="text-xxs text-fg-tertiary"
              style={{ width: 28, flexShrink: 0, fontSize: 9 }}
            >
              {week[1]?.date && new Date(week[1].date + "T00:00:00").getDate() <= 7
                ? formatMonthLabel(week[1].date)
                : ""}
            </div>

            {week.map((day, di) => (
              <div
                key={di}
                title={
                  day.date
                    ? `${day.date}: ${day.trained ? `${day.workouts.length} entreno(s)` : "Descanso"}`
                    : ""
                }
                className="rounded-xxs"
                style={{
                  width: 12,
                  height: 12,
                  flexShrink: 0,
                  ...(day.date ? LEVEL_STYLES[day.level ?? 0] : { background: "transparent" }),
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-xs mt-sm">
        <span className="text-xxs text-fg-tertiary">Menos</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="rounded-xxs"
            style={{ width: 10, height: 10, ...LEVEL_STYLES[level] }}
          />
        ))}
        <span className="text-xxs text-fg-tertiary">Más</span>
      </div>
    </div>
  );
};
