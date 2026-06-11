"use client";

import React, { useState, useEffect } from "react";
import { Dumbbell } from "lucide-react";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCoachStudentMuscleDistribution } from "@/lib/api/coaching-progress";
import { getErrorMessage } from "@/lib/utils";
import type { ProgressRange, MuscleDistributionEntry } from "@/lib/api/types";

interface MuscleDistributionChartProps {
  studentId: number;
  range: ProgressRange;
}

// Monochromatic palette using chart tokens with descending opacity
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Additional slots using chart-1 with opacity fallback
const CHART_OPACITIES = [1, 0.85, 0.7, 0.55, 0.4, 0.3, 0.22, 0.16];

function getColor(index: number): string {
  if (index < CHART_COLORS.length) return CHART_COLORS[index];
  // Fallback: use chart-1 with decreasing opacity
  const opacity = CHART_OPACITIES[index] ?? 0.1;
  return `rgba(var(--chart-1-raw, 10, 132, 255), ${opacity})`;
}

// ─── SVG Donut ─────────────────────────────────────────────────────────────────

interface DonutSegment {
  startAngle: number;
  endAngle: number;
  color: string;
  label: string;
  pct: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  startDeg: number,
  endDeg: number
): string {
  const clampedEnd = Math.min(endDeg, startDeg + 359.9999);
  const o1 = polarToCartesian(cx, cy, outer, startDeg);
  const o2 = polarToCartesian(cx, cy, outer, clampedEnd);
  const i1 = polarToCartesian(cx, cy, inner, clampedEnd);
  const i2 = polarToCartesian(cx, cy, inner, startDeg);
  const large = clampedEnd - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${i2.x} ${i2.y}`,
    "Z",
  ].join(" ");
}

interface DonutChartProps {
  distribution: MuscleDistributionEntry[];
  size?: number;
}

function DonutChart({ distribution, size = 120 }: DonutChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.42;
  const inner = size * 0.26;

  const segments: DonutSegment[] = [];
  let currentAngle = 0;
  const total = distribution.reduce((s, e) => s + e.set_count, 0);

  for (let i = 0; i < distribution.length; i++) {
    const entry = distribution[i];
    const angleDeg = (entry.set_count / total) * 360;
    // Clamp minimum angle so tiny slices are visible
    const safeAngle = Math.max(angleDeg, 2);
    segments.push({
      startAngle: currentAngle,
      endAngle: currentAngle + safeAngle,
      color: getColor(i),
      label: entry.muscle_group,
      pct: entry.percentage,
    });
    currentAngle += safeAngle;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Gráfico de distribución muscular"
      role="img"
      style={{ flexShrink: 0 }}
    >
      {segments.map((seg, i) => (
        <path
          key={i}
          d={describeArc(cx, cy, outer, inner, seg.startAngle, seg.endAngle)}
          fill={seg.color}
          opacity={0.9}
        />
      ))}
      {/* Center text: total sets */}
      <text
        x={cx}
        y={cy - 5}
        textAnchor="middle"
        fontSize={11}
        fontWeight="700"
        fill="var(--fg)"
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 9}
        textAnchor="middle"
        fontSize={8}
        fill="var(--fg-tertiary)"
      >
        series
      </text>
    </svg>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function MuscleDistributionSkeleton() {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-col gap-xxs">
        <SkeletonLine width="50%" height={14} />
        <SkeletonLine width="65%" height={11} />
      </div>
      <div
        className="rounded-md p-md flex gap-lg items-center"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <SkeletonBox width={120} height={120} className="rounded-pill flex-shrink-0" />
        <div className="flex flex-col gap-sm flex-1">
          {[70, 55, 45, 35].map((w, i) => (
            <SkeletonLine key={i} width={`${w}%`} height={11} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function MuscleDistributionChart({ studentId, range }: MuscleDistributionChartProps) {
  const [distribution, setDistribution] = useState<MuscleDistributionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCoachStudentMuscleDistribution(studentId, range)
      .then((res) => {
        if (!cancelled) setDistribution(res.distribution);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Error al cargar distribución muscular"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, range]);

  if (loading) return <MuscleDistributionSkeleton />;

  return (
    <div className="flex flex-col gap-sm">
      {/* Title */}
      <div className="flex flex-col gap-xxs">
        <h3 className="text-base font-semibold text-fg m-0">Distribución muscular</h3>
        <p className="text-sm text-fg-secondary m-0">
          Grupos musculares trabajados en el período
        </p>
      </div>

      {error ? (
        <ErrorBanner message={error} />
      ) : distribution.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={28} />}
          title="Sin datos musculares"
          description="No hay ejercicios registrados con grupos musculares en este período."
        />
      ) : (
        <div
          className="rounded-md p-md flex gap-lg items-center"
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          {/* Donut */}
          <DonutChart distribution={distribution} size={120} />

          {/* Legend */}
          <div className="flex flex-col gap-xs flex-1 min-w-0">
            {distribution.map((entry, i) => (
              <div key={entry.muscle_group} className="flex items-center gap-xs min-w-0">
                <span
                  className="flex-shrink-0 rounded-pill"
                  style={{
                    width: 8,
                    height: 8,
                    background: getColor(i),
                  }}
                  aria-hidden="true"
                />
                <span
                  className="text-xs flex-1 truncate"
                  style={{ color: "var(--fg-secondary)" }}
                >
                  {capitalize(entry.muscle_group)}
                </span>
                <span
                  className="text-xs font-semibold flex-shrink-0"
                  style={{ color: "var(--fg)" }}
                >
                  {Math.round(entry.percentage)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
