"use client";

import React, { useState } from "react";
import { OneRMChart } from "./OneRMChart";
import { ConsistencyHeatmapChart } from "./ConsistencyHeatmapChart";
import { MuscleDistributionChart } from "./MuscleDistributionChart";
import { AdherenceBars } from "./AdherenceBars";
import { WeeklyVolumeChart } from "./WeeklyVolumeChart";
import type { ProgressRange } from "@/lib/api/types";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface StudentProgressTabProps {
  studentId: number;
}

// ─── Range selector ────────────────────────────────────────────────────────────

interface RangeOption {
  value: ProgressRange;
  label: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  { value: "current_month", label: "Este mes" },
  { value: "previous_month", label: "Mes anterior" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "12 meses" },
];

interface RangeSelectorProps {
  value: ProgressRange;
  onChange: (range: ProgressRange) => void;
}

function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div
      className="flex items-center gap-xs flex-wrap"
      role="group"
      aria-label="Seleccionar período"
    >
      {RANGE_OPTIONS.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className="inline-flex items-center justify-center rounded-pill border text-sm font-semibold transition-colors whitespace-nowrap"
            style={{
              height: 32,
              paddingLeft: 12,
              paddingRight: 12,
              background: isActive ? "var(--primary)" : "var(--fill-tertiary)",
              color: isActive ? "var(--on-primary)" : "var(--fg)",
              borderColor: isActive ? "transparent" : "var(--separator)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * StudentProgressTab — contenedor con selector de range compartido y 5 charts
 * de progreso del alumno. Embebible como tab en el perfil del alumno.
 *
 * Props:
 *   studentId — ID del alumno
 */
export function StudentProgressTab({ studentId }: StudentProgressTabProps) {
  const [range, setRange] = useState<ProgressRange>("current_month");

  return (
    <div className="flex flex-col gap-xxl">
      {/* Range selector */}
      <div className="flex flex-col gap-sm">
        <p className="text-sm text-fg-secondary m-0">Período</p>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Charts grid — 2 columns on medium+, single column on small */}
      <div className="grid grid-cols-1 gap-xxl md:grid-cols-2">
        {/* 1RM Chart — full width always (has its own exercise selector) */}
        <div className="md:col-span-2">
          <OneRMChart studentId={studentId} range={range} />
        </div>

        {/* Consistency Heatmap — full width (wide component) */}
        <div className="md:col-span-2">
          <ConsistencyHeatmapChart studentId={studentId} range={range} />
        </div>

        {/* Adherence Bars — full width (scrollable bars) */}
        <div className="md:col-span-2">
          <AdherenceBars studentId={studentId} range={range} />
        </div>

        {/* Muscle Distribution — half width on md+ */}
        <div>
          <MuscleDistributionChart studentId={studentId} range={range} />
        </div>

        {/* Weekly Volume — half width on md+ */}
        <div>
          <WeeklyVolumeChart studentId={studentId} range={range} />
        </div>
      </div>
    </div>
  );
}
