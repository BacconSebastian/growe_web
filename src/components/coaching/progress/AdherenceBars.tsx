"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CalendarCheck } from "lucide-react";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCoachStudentPlanningAdherence } from "@/lib/api/coaching-progress";
import { getErrorMessage } from "@/lib/utils";
import type { ProgressRange, PlanningAdherenceWeek } from "@/lib/api/types";

interface AdherenceBarsProps {
  studentId: number;
  range: ProgressRange;
}

// ─── Chart constants ───────────────────────────────────────────────────────────

const BAR_W = 28;
const BAR_GAP = 8;
const BAR_MAX_H = 100;
const BAR_MIN_H = 8;
const PAD_T = 16;
const PAD_B = 44; // week_label + planning label
const PAD_L = 36;
const PAD_R = 8;
const CHART_H = PAD_T + BAR_MAX_H + PAD_B;
const Y_STEPS = [0, 25, 50, 75, 100];
const PLANNING_MAX_CHARS = 12;

function truncateName(name: string): string {
  return name.length > PLANNING_MAX_CHARS
    ? name.slice(0, PLANNING_MAX_CHARS - 1) + "…"
    : name;
}

function barColor(pct: number | null): string {
  if (pct === null) return "var(--fg-tertiary)";
  if (pct >= 80) return "var(--success)";
  if (pct >= 50) return "var(--warning)";
  return "var(--destructive)";
}

// ─── SVG bars ─────────────────────────────────────────────────────────────────

interface AdherenceSvgProps {
  weeks: PlanningAdherenceWeek[];
  containerWidth: number;
  onBarClick: (week: PlanningAdherenceWeek) => void;
}

function AdherenceSvg({ weeks, containerWidth, onBarClick }: AdherenceSvgProps) {
  const availableW = containerWidth - PAD_L - PAD_R;
  const naturalContent = weeks.length * (BAR_W + BAR_GAP) - BAR_GAP;
  const barWidth =
    weeks.length > 1 && naturalContent < availableW
      ? (availableW - (weeks.length - 1) * BAR_GAP) / weeks.length
      : BAR_W;

  const svgContentW = weeks.length * (barWidth + BAR_GAP) - BAR_GAP + PAD_L + PAD_R;
  const svgW = Math.max(svgContentW, containerWidth);
  const needsScroll = svgContentW > containerWidth;

  const weekLabelY = CHART_H - 20;
  const planningLabelY = CHART_H - 4;

  // Planning group separators
  const separators: number[] = [];
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1].planning?.id ?? null;
    const curr = weeks[i].planning?.id ?? null;
    if (prev !== curr) {
      separators.push(PAD_L + i * (barWidth + BAR_GAP) - BAR_GAP / 2);
    }
  }

  // Planning groups for labels
  interface PlanGroup {
    name: string | null;
    start: number;
    end: number;
  }
  const planGroups: PlanGroup[] = [];
  if (weeks.length > 0) {
    let gStart = 0;
    let curId = weeks[0].planning?.id ?? null;
    let curName = weeks[0].planning?.name ?? null;
    for (let i = 1; i <= weeks.length; i++) {
      const id = i < weeks.length ? (weeks[i].planning?.id ?? null) : undefined;
      if (id !== curId) {
        planGroups.push({ name: curName, start: gStart, end: i - 1 });
        gStart = i;
        curId = i < weeks.length ? (weeks[i].planning?.id ?? null) : null;
        curName = i < weeks.length ? (weeks[i].planning?.name ?? null) : null;
      }
    }
  }

  const chart = (
    <svg
      width={svgW}
      height={CHART_H}
      viewBox={`0 0 ${svgW} ${CHART_H}`}
      aria-label="Gráfico de adherencia al plan"
      role="img"
    >
      {/* Y grid + labels */}
      {Y_STEPS.map((step) => {
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
                {step}
              </text>
            )}
          </g>
        );
      })}

      {/* Planning separators */}
      {separators.map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={PAD_T}
          x2={x}
          y2={PAD_T + BAR_MAX_H}
          stroke="var(--separator)"
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.6}
        />
      ))}

      {/* Bars */}
      {weeks.map((week, i) => {
        const pct = week.adherence_percent;
        const isNull = pct === null;
        const safePct = isNull ? 0 : Math.min(100, Math.max(0, pct));
        const barH = isNull
          ? BAR_MIN_H
          : Math.max(BAR_MIN_H, (safePct / 100) * BAR_MAX_H);
        const x = PAD_L + i * (barWidth + BAR_GAP);
        const y = PAD_T + BAR_MAX_H - barH;
        const color = barColor(pct);
        const labelShort = week.week_label.replace("Sem ", "S").slice(0, 6);

        return (
          <g
            key={week.week_start}
            onClick={() => onBarClick(week)}
            style={{ cursor: "pointer" }}
            role="button"
            aria-label={`${week.week_label}: ${isNull ? "sin datos" : `${Math.round(safePct)}%`}`}
            tabIndex={0}
          >
            {/* Enlarged tap area */}
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
              fill={color}
              opacity={isNull ? 0.4 : 0.85}
            />
            {/* Percentage label */}
            {!isNull && safePct >= 10 && (
              <text
                x={x + barWidth / 2}
                y={y - 3}
                fontSize={9}
                fill={color}
                textAnchor="middle"
                fontWeight="600"
              >
                {Math.round(safePct)}%
              </text>
            )}
            {/* Week label */}
            <text
              x={x + barWidth / 2}
              y={weekLabelY}
              fontSize={9}
              fill="var(--fg-tertiary)"
              textAnchor="middle"
            >
              {labelShort}
            </text>
          </g>
        );
      })}

      {/* Planning group labels */}
      {planGroups.map((group, i) => {
        const startX = PAD_L + group.start * (barWidth + BAR_GAP);
        const endX = PAD_L + group.end * (barWidth + BAR_GAP) + barWidth;
        const cx = (startX + endX) / 2;
        const label = group.name ? truncateName(group.name) : "—";
        return (
          <text
            key={i}
            x={cx}
            y={planningLabelY}
            fontSize={9}
            fill="var(--fg-secondary)"
            textAnchor="middle"
          >
            {label}
          </text>
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

// ─── Detail popover ────────────────────────────────────────────────────────────

interface AdherenceDetailProps {
  week: PlanningAdherenceWeek;
  onClose: () => void;
}

function AdherenceDetail({ week, onClose }: AdherenceDetailProps) {
  const pct = week.adherence_percent;
  const color = barColor(pct);

  return (
    <div
      className="rounded-md p-md flex flex-col gap-sm"
      style={{
        background: "var(--card-elevated)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-start justify-between gap-sm">
        <div>
          <p className="text-sm font-semibold text-fg m-0">{week.week_label}</p>
          {week.planning && (
            <p className="text-xs text-fg-secondary m-0">{week.planning.name}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-fg-tertiary hover:text-fg transition-colors"
          aria-label="Cerrar detalle"
        >
          ✕
        </button>
      </div>

      {pct === null && !week.planning ? (
        <p className="text-sm text-fg-secondary m-0">Sin planificación activa esta semana.</p>
      ) : pct === null ? (
        <p className="text-sm text-fg-secondary m-0">
          Planificación vigente sin días programados esta semana.
        </p>
      ) : (
        <div className="flex items-center gap-md">
          <span className="text-xxl font-bold" style={{ color }}>
            {Math.round(pct)}%
          </span>
          <div className="flex flex-col gap-xxs">
            <span className="text-xs text-fg-secondary">
              {week.completed_days} / {week.planned_days} días completados
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function AdherenceBarsSkeleton() {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-col gap-xxs">
        <SkeletonLine width="42%" height={14} />
        <SkeletonLine width="58%" height={11} />
      </div>
      <div
        className="rounded-md p-md"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <div className="flex items-end gap-sm" style={{ height: CHART_H }}>
          {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
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

export function AdherenceBars({ studentId, range }: AdherenceBarsProps) {
  const [weeks, setWeeks] = useState<PlanningAdherenceWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<PlanningAdherenceWeek | null>(null);
  const [containerWidth, setContainerWidth] = useState(480);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedWeek(null);
    getCoachStudentPlanningAdherence(studentId, range)
      .then((res) => {
        if (!cancelled) setWeeks(res.weeks);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Error al cargar adherencia al plan"));
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

  // Average over measurable weeks
  const measurable = weeks.filter((w) => w.adherence_percent !== null);
  const avgPct =
    measurable.length > 0
      ? Math.round(
          measurable.reduce((s, w) => s + (w.adherence_percent as number), 0) /
            measurable.length
        )
      : null;

  if (loading) return <AdherenceBarsSkeleton />;

  return (
    <div className="flex flex-col gap-sm">
      {/* Title */}
      <div className="flex flex-col gap-xxs">
        <h3 className="text-base font-semibold text-fg m-0">Adherencia al plan</h3>
        <p className="text-sm text-fg-secondary m-0">
          Cumplimiento semanal de la planificación
        </p>
      </div>

      {error ? (
        <ErrorBanner message={error} />
      ) : weeks.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={28} />}
          title="Sin datos de planificación"
          description="No hay semanas registradas en este período."
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
            <AdherenceSvg
              weeks={weeks}
              containerWidth={containerWidth - 24}
              onBarClick={(week) =>
                setSelectedWeek((prev) =>
                  prev?.week_start === week.week_start ? null : week
                )
              }
            />

            {avgPct !== null && (
              <div className="flex items-center gap-sm mt-sm">
                <span className="text-xs text-fg-secondary">Promedio:</span>
                <span
                  className="text-base font-bold"
                  style={{ color: barColor(avgPct) }}
                >
                  {avgPct}%
                </span>
              </div>
            )}
          </div>

          {selectedWeek && (
            <AdherenceDetail
              week={selectedWeek}
              onClose={() => setSelectedWeek(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
