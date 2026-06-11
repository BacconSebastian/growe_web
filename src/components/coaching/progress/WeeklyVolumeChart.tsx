"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BarChart2 } from "lucide-react";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStudentTrainedVolume } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import type { ProgressRange, WeeklyVolumeData } from "@/lib/api/types";

interface WeeklyVolumeChartProps {
  studentId: number;
  range: ProgressRange;
}

// Map ProgressRange → weeks count for the weekly-volume API
function rangeToWeeks(range: ProgressRange): number {
  switch (range) {
    case "current_month":
    case "previous_month":
      return 4;
    case "3m":
      return 12;
    case "6m":
      return 24;
    case "12m":
      return 52;
    default:
      return 8;
  }
}

// ─── Chart constants ───────────────────────────────────────────────────────────

const BAR_W = 32;
const BAR_GAP = 8;
const BAR_MAX_H = 100;
const BAR_MIN_H = 4;
const PAD_T = 16;
const PAD_B = 36;
const PAD_L = 44;
const PAD_R = 8;
const CHART_H = PAD_T + BAR_MAX_H + PAD_B;

// ─── SVG bar chart ─────────────────────────────────────────────────────────────

interface VolumeMuscleGroup {
  name: string;
  total_sets: number;
  total_reps: number;
  workouts: number;
}

interface VolumeBar {
  label: string;
  totalSets: number;
  groups: VolumeMuscleGroup[];
  start: string;
  end: string;
}

function buildBars(data: WeeklyVolumeData): VolumeBar[] {
  const totalSets = data.total_sets ?? data.muscle_groups.reduce((s, g) => s + g.total_sets, 0);
  return [
    {
      label: formatWeekLabel(data.period.start),
      totalSets,
      groups: data.muscle_groups,
      start: data.period.start,
      end: data.period.end,
    },
  ];
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleString("es-AR", { day: "numeric", month: "short" });
}

interface VolumeBarChartProps {
  bars: VolumeBar[];
  containerWidth: number;
  onBarClick?: (bar: VolumeBar) => void;
}

function VolumeBarChart({ bars, containerWidth, onBarClick }: VolumeBarChartProps) {
  if (bars.length === 0) return null;

  const availableW = containerWidth - PAD_L - PAD_R;
  const naturalContent = bars.length * (BAR_W + BAR_GAP) - BAR_GAP;
  const barWidth =
    bars.length > 1 && naturalContent < availableW
      ? (availableW - (bars.length - 1) * BAR_GAP) / bars.length
      : BAR_W;

  const maxSets = Math.max(...bars.map((b) => b.totalSets), 1);
  const svgContentW = bars.length * (barWidth + BAR_GAP) - BAR_GAP + PAD_L + PAD_R;
  const svgW = Math.max(svgContentW, containerWidth);
  const needsScroll = svgContentW > containerWidth;

  // Y ticks
  const ySteps = [0, 25, 50, 75, 100];

  const chart = (
    <svg
      width={svgW}
      height={CHART_H}
      viewBox={`0 0 ${svgW} ${CHART_H}`}
      aria-label="Gráfico de volumen semanal"
      role="img"
    >
      <defs>
        <linearGradient id="volBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {ySteps.map((step) => {
        const val = (step / 100) * maxSets;
        const y = PAD_T + BAR_MAX_H - (step / 100) * BAR_MAX_H;
        return (
          <g key={step}>
            <line
              x1={PAD_L}
              y1={y}
              x2={svgW - PAD_R}
              y2={y}
              stroke="var(--separator-subtle)"
              strokeWidth={1}
              strokeDasharray="2 6"
            />
            {step > 0 && (
              <text
                x={PAD_L - 4}
                y={y + 4}
                fontSize={9}
                fill="var(--fg-tertiary)"
                textAnchor="end"
              >
                {Math.round(val)}
              </text>
            )}
          </g>
        );
      })}

      {/* Bars */}
      {bars.map((bar, i) => {
        const ratio = bar.totalSets / maxSets;
        const barH = Math.max(BAR_MIN_H, ratio * BAR_MAX_H);
        const x = PAD_L + i * (barWidth + BAR_GAP);
        const y = PAD_T + BAR_MAX_H - barH;

        return (
          <g
            key={bar.start}
            onClick={() => onBarClick?.(bar)}
            style={{ cursor: onBarClick ? "pointer" : "default" }}
            role={onBarClick ? "button" : undefined}
            aria-label={`${bar.label}: ${bar.totalSets} series`}
            tabIndex={onBarClick ? 0 : undefined}
          >
            <rect
              x={x - 4}
              y={PAD_T}
              width={barWidth + 8}
              height={BAR_MAX_H + PAD_B}
              fill="transparent"
            />
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={4}
              fill="url(#volBarGrad)"
              opacity={0.9}
            />
            {/* Value on top */}
            {bar.totalSets > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 3}
                fontSize={9}
                fill="var(--chart-2)"
                textAnchor="middle"
                fontWeight="600"
              >
                {bar.totalSets}
              </text>
            )}
            {/* X label */}
            <text
              x={x + barWidth / 2}
              y={CHART_H - 4}
              fontSize={9}
              fill="var(--fg-tertiary)"
              textAnchor="middle"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );

  if (needsScroll) {
    return (
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{chart}</div>
    );
  }
  return chart;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function WeeklyVolumeSkeleton() {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-col gap-xxs">
        <SkeletonLine width="40%" height={14} />
        <SkeletonLine width="55%" height={11} />
      </div>
      <div
        className="rounded-md p-md"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <div className="flex items-end gap-sm" style={{ height: CHART_H }}>
          {[50, 80, 60, 90, 45, 70, 85].map((h, i) => (
            <SkeletonBox
              key={i}
              width={BAR_W}
              height={Math.round((h / 100) * BAR_MAX_H)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function WeeklyVolumeChart({ studentId, range }: WeeklyVolumeChartProps) {
  const [volumeData, setVolumeData] = useState<WeeklyVolumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(480);
  const [selectedBar, setSelectedBar] = useState<VolumeBar | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedBar(null);
    const weeks = rangeToWeeks(range);
    getStudentTrainedVolume(studentId, { weeks })
      .then((res) => {
        if (!cancelled) setVolumeData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Error al cargar volumen semanal"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, range]);

  const handleContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (el) setContainerWidth(el.clientWidth || 480);
  }, []);

  if (loading) return <WeeklyVolumeSkeleton />;

  const bars = volumeData ? buildBars(volumeData) : [];
  const hasSets =
    volumeData &&
    (volumeData.total_sets ?? 0) + volumeData.muscle_groups.reduce((s, g) => s + g.total_sets, 0) >
      0;

  return (
    <div className="flex flex-col gap-sm">
      {/* Title */}
      <div className="flex flex-col gap-xxs">
        <h3 className="text-base font-semibold text-fg m-0">Volumen semanal</h3>
        <p className="text-sm text-fg-secondary m-0">
          Series totales entrenadas en el período
        </p>
      </div>

      {error ? (
        <ErrorBanner message={error} />
      ) : !hasSets ? (
        <EmptyState
          icon={<BarChart2 size={28} />}
          title="Sin datos de volumen"
          description="No hay entrenamientos registrados en este período."
        />
      ) : (
        <>
          <div
            ref={handleContainerRef}
            className="rounded-md p-md"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
            }}
          >
            <VolumeBarChart
              bars={bars}
              containerWidth={containerWidth - 24}
              onBarClick={(bar) =>
                setSelectedBar((prev) =>
                  prev?.start === bar.start ? null : bar
                )
              }
            />
          </div>

          {/* Detail card */}
          {selectedBar && (
            <div
              className="rounded-md p-md flex flex-col gap-sm"
              style={{
                background: "var(--card-elevated)",
                border: "1px solid var(--card-border)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-fg m-0">
                  Semana del {selectedBar.label}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedBar(null)}
                  className="text-xs text-fg-tertiary hover:text-fg"
                  aria-label="Cerrar detalle"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-fg-secondary m-0">
                Total: <strong className="text-fg">{selectedBar.totalSets} series</strong>
              </p>
              {selectedBar.groups.length > 0 && (
                <div className="flex flex-col gap-xxs">
                  {selectedBar.groups.map((g, i) => (
                    <div key={g.name} className="flex items-center gap-sm text-xs">
                      <span
                        className="flex-shrink-0 rounded-pill"
                        style={{
                          width: 8,
                          height: 8,
                          background: `var(--chart-${(i % 5) + 1})`,
                        }}
                      />
                      <span className="text-fg-secondary flex-1 truncate capitalize">
                        {g.name}
                      </span>
                      <span className="text-fg font-medium">{g.total_sets} series</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
