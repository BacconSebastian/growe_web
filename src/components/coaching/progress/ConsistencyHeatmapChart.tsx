"use client";

import React, { useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeatmapGrid } from "@/components/students/HeatmapGrid";
import { getCoachStudentConsistencyHeatmap } from "@/lib/api/coaching-progress";
import { getErrorMessage } from "@/lib/utils";
import type { ProgressRange, ConsistencyHeatmapDay } from "@/lib/api/types";

interface ConsistencyHeatmapChartProps {
  studentId: number;
  range: ProgressRange;
}

function ConsistencyHeatmapSkeleton() {
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
        <SkeletonBox width="100%" height={120} />
      </div>
    </div>
  );
}

export function ConsistencyHeatmapChart({ studentId, range }: ConsistencyHeatmapChartProps) {
  const [days, setDays] = useState<ConsistencyHeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCoachStudentConsistencyHeatmap(studentId, range)
      .then((res) => {
        if (!cancelled) setDays(res.days);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Error al cargar datos de consistencia"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, range]);

  if (loading) return <ConsistencyHeatmapSkeleton />;

  return (
    <div className="flex flex-col gap-sm">
      {/* Title */}
      <div className="flex flex-col gap-xxs">
        <h3 className="text-base font-semibold text-fg m-0">Consistencia</h3>
        <p className="text-sm text-fg-secondary m-0">Días de entrenamiento en el período</p>
      </div>

      {error ? (
        <ErrorBanner message={error} />
      ) : days.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="Sin datos de consistencia"
          description="No hay entrenamientos registrados en este período."
        />
      ) : (
        <div
          className="rounded-md p-md overflow-x-auto"
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          <HeatmapGrid days={days} />
        </div>
      )}
    </div>
  );
}
