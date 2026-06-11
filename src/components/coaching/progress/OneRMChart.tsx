"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, Dumbbell, ChevronDown } from "lucide-react";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getCoachStudentOneRMExercises,
  getCoachStudentOneRMProgression,
} from "@/lib/api/coaching-progress";
import { getErrorMessage } from "@/lib/utils";
import type {
  ProgressRange,
  OneRMExerciseOption,
  OneRMProgressionPoint,
} from "@/lib/api/types";

interface OneRMChartProps {
  studentId: number;
  range: ProgressRange;
}

// ─── SVG line chart ────────────────────────────────────────────────────────────

interface SvgLineChartProps {
  points: OneRMProgressionPoint[];
  width: number;
  height: number;
}

function SvgLineChart({ points, width, height }: SvgLineChartProps) {
  if (points.length === 0) return null;

  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 28;

  const chartW = width - PAD_L - PAD_R;
  const chartH = height - PAD_T - PAD_B;

  const values = points.map((p) => p.one_rm_kg);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    points.length === 1
      ? PAD_L + chartW / 2
      : PAD_L + (i / (points.length - 1)) * chartW;

  const toY = (v: number) =>
    PAD_T + chartH - ((v - minVal) / range) * chartH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.one_rm_kg)}`)
    .join(" ");

  // Area fill path
  const areaD =
    pathD +
    ` L ${toX(points.length - 1)} ${PAD_T + chartH} L ${toX(0)} ${PAD_T + chartH} Z`;

  // Y axis labels (3 ticks)
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal].map((v) => ({
    v,
    y: toY(v),
  }));

  // Format date label
  const formatShort = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleString("es-AR", { day: "numeric", month: "short" });
  };

  // X axis labels — show max 5 evenly spaced
  const step = Math.max(1, Math.floor(points.length / 5));
  const xLabels = points
    .map((p, i) => ({ i, p }))
    .filter(({ i }) => i === 0 || i === points.length - 1 || i % step === 0)
    .slice(0, 5);

  // PR points (local maxima or absolute max)
  const maxPR = Math.max(...values);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="Gráfico de progresión 1RM"
      role="img"
    >
      <defs>
        <linearGradient id="oneRmGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map(({ v, y }) => (
        <g key={v}>
          <line
            x1={PAD_L}
            y1={y}
            x2={width - PAD_R}
            y2={y}
            stroke="var(--separator-subtle)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <text
            x={PAD_L - 6}
            y={y + 4}
            fontSize={10}
            fill="var(--fg-tertiary)"
            textAnchor="end"
          >
            {Math.round(v)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#oneRmGrad)" />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {points.map((p, i) => {
        const cx = toX(i);
        const cy = toY(p.one_rm_kg);
        const isPR = p.one_rm_kg === maxPR;
        return (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r={isPR ? 5 : 3}
              fill={isPR ? "var(--chart-1)" : "var(--card)"}
              stroke="var(--chart-1)"
              strokeWidth={isPR ? 0 : 2}
            />
          </g>
        );
      })}

      {/* X axis labels */}
      {xLabels.map(({ i, p }) => (
        <text
          key={i}
          x={toX(i)}
          y={PAD_T + chartH + PAD_B - 4}
          fontSize={9}
          fill="var(--fg-tertiary)"
          textAnchor="middle"
        >
          {formatShort(p.date)}
        </text>
      ))}
    </svg>
  );
}

// ─── Exercise selector ─────────────────────────────────────────────────────────

interface ExerciseSelectorProps {
  exercises: OneRMExerciseOption[];
  selected: OneRMExerciseOption | null;
  onSelect: (ex: OneRMExerciseOption) => void;
}

function ExerciseSelector({ exercises, selected, onSelect }: ExerciseSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-sm px-md rounded-sm border text-sm font-medium transition-colors"
        style={{
          height: 36,
          background: "var(--fill-tertiary)",
          borderColor: "var(--separator)",
          color: "var(--fg)",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate flex-1 text-left">
          {selected?.name ?? "Seleccionar ejercicio…"}
        </span>
        <ChevronDown size={14} style={{ color: "var(--fg-secondary)", flexShrink: 0 }} />
      </button>

      {open && (
        <div
          className="absolute z-10 top-full left-0 right-0 mt-xxs rounded-sm border overflow-hidden"
          style={{
            background: "var(--card-elevated)",
            borderColor: "var(--separator)",
            boxShadow: "var(--shadow-elevated)",
            maxHeight: 200,
            overflowY: "auto",
          }}
          role="listbox"
        >
          {exercises.map((ex) => (
            <button
              key={ex.exercise_id}
              type="button"
              role="option"
              aria-selected={selected?.exercise_id === ex.exercise_id}
              onClick={() => {
                onSelect(ex);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-md py-sm text-sm transition-colors hover:bg-fill-tertiary text-left"
              style={{
                color: "var(--fg)",
                background:
                  selected?.exercise_id === ex.exercise_id
                    ? "var(--primary-alpha-08)"
                    : undefined,
              }}
            >
              <span className="truncate flex-1">{ex.name}</span>
              <span className="text-xs ml-sm flex-shrink-0" style={{ color: "var(--fg-tertiary)" }}>
                {ex.log_count} logs
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function OneRMChartSkeleton() {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-col gap-xxs">
        <SkeletonLine width="45%" height={14} />
        <SkeletonLine width="60%" height={11} />
      </div>
      <SkeletonBox width="100%" height={36} />
      <SkeletonBox width="100%" height={160} />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function OneRMChart({ studentId, range }: OneRMChartProps) {
  const [exercises, setExercises] = useState<OneRMExerciseOption[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<OneRMExerciseOption | null>(null);
  const [points, setPoints] = useState<OneRMProgressionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(480);

  // Fetch exercises
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCoachStudentOneRMExercises(studentId, range)
      .then((res) => {
        if (cancelled) return;
        setExercises(res.exercises);
        // Auto-select first exercise when list loads/changes range
        setSelectedExercise((prev) => {
          if (prev) {
            const stillExists = res.exercises.find((e) => e.exercise_id === prev.exercise_id);
            return stillExists ?? (res.exercises[0] ?? null);
          }
          return res.exercises[0] ?? null;
        });
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Error al cargar ejercicios"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, range]);

  // Fetch progression for selected exercise
  useEffect(() => {
    if (!selectedExercise) {
      setPoints([]);
      return;
    }
    let cancelled = false;
    getCoachStudentOneRMProgression(studentId, selectedExercise.exercise_id, range)
      .then((res) => {
        if (!cancelled) setPoints(res.progression ?? []);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, selectedExercise, range]);

  const handleContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (el) setChartWidth(el.clientWidth || 480);
  }, []);

  if (loading) return <OneRMChartSkeleton />;

  return (
    <div className="flex flex-col gap-sm">
      {/* Title */}
      <div className="flex flex-col gap-xxs">
        <h3 className="text-base font-semibold text-fg m-0">1RM estimado</h3>
        <p className="text-sm text-fg-secondary m-0">
          Evolución del peso máximo estimado por ejercicio
        </p>
      </div>

      {error ? (
        <ErrorBanner message={error} />
      ) : exercises.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={28} />}
          title="Sin datos de 1RM"
          description="El alumno aún no tiene entrenamientos con peso registrados en este período."
        />
      ) : (
        <>
          {/* Exercise selector */}
          <ExerciseSelector
            exercises={exercises}
            selected={selectedExercise}
            onSelect={(ex) => setSelectedExercise(ex)}
          />

          {/* Chart card */}
          <div
            ref={handleContainerRef}
            className="rounded-md p-md"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
            }}
          >
            {points.length === 0 ? (
              <div
                className="flex items-center justify-center gap-sm py-lg"
                style={{ color: "var(--fg-tertiary)" }}
              >
                <TrendingUp size={18} />
                <span className="text-sm">Sin registros en este rango</span>
              </div>
            ) : (
              <SvgLineChart
                points={points}
                width={chartWidth - 24}
                height={180}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
