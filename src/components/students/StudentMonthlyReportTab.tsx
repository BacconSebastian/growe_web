"use client";

import React, { useEffect, useState } from "react";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { getStudentMonthlyReport } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import type { MonthlyReport } from "@/lib/api/types";

interface StudentMonthlyReportTabProps {
  studentId: number;
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-xl">
      <div className="flex items-center justify-between">
        <SkeletonLine width={140} height={18} />
        <div className="flex gap-sm">
          <SkeletonBox width={36} height={36} />
          <SkeletonBox width={36} height={36} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-md">
        {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonBox key={i} height={80} />)}
      </div>
      <SkeletonBox height={200} />
    </div>
  );
}

function formatMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function getMonthString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

interface StatRowProps {
  label: string;
  value: string | number;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex items-center justify-between gap-md py-md"
      style={{ borderBottom: "1px solid var(--separator-subtle)" }}
    >
      <span className="text-sm text-fg-secondary">{label}</span>
      <span className="text-sm font-semibold text-fg">{value}</span>
    </div>
  );
}

/**
 * StudentMonthlyReportTab — reporte mensual del alumno con selector de mes.
 */
export const StudentMonthlyReportTab: React.FC<StudentMonthlyReportTabProps> = ({
  studentId,
}) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<MonthlyReport | null>(null);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setReport(null);
      try {
        const data = await getStudentMonthlyReport(studentId, getMonthString(year, month));
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "No se pudo cargar el reporte mensual"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId, year, month]);

  const handlePrev = () => {
    const { year: y, month: m } = addMonths(year, month, -1);
    setYear(y); setMonth(m);
  };

  const handleNext = () => {
    if (isCurrentMonth) return;
    const { year: y, month: m } = addMonths(year, month, 1);
    setYear(y); setMonth(m);
  };

  return (
    <div className="flex flex-col gap-xl">
      {/* Selector de mes */}
      <div className="flex items-center justify-between gap-md">
        <span className="text-lg font-semibold text-fg capitalize">
          {formatMonthLabel(year, month)}
        </span>
        <div className="flex gap-sm">
          <Button variant="secondary" size="sm" onClick={handlePrev} iconLeft={<ChevronLeft size={14} />}>
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleNext}
            disabled={isCurrentMonth}
            iconRight={<ChevronRight size={14} />}
          >
            Siguiente
          </Button>
        </div>
      </div>

      {loading && <ReportSkeleton />}
      {!loading && error && <ErrorBanner message={error} />}
      {!loading && !error && !report && (
        <EmptyState
          icon={<FileText size={24} />}
          title="Sin datos"
          description="No hay datos de entrenamiento para este mes."
        />
      )}

      {!loading && !error && report && (
        <div className="flex flex-col gap-xl">
          {/* Resumen general */}
          <div
            className="flex flex-col rounded-lg p-xl"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
            }}
          >
            <h3 className="text-base font-semibold text-fg mb-md m-0">Resumen</h3>
            <div className="flex flex-col">
              <StatRow label="Entrenamientos totales" value={report.summary.total_workouts} />
              <StatRow label="Días entrenados" value={report.summary.workout_days} />
              <StatRow label="Días de descanso" value={report.summary.rest_days} />
              <StatRow
                label="Duración promedio"
                value={`${Math.round(report.summary.average_duration_minutes)} min`}
              />
              <StatRow
                label="Duración total"
                value={`${Math.round(report.summary.total_duration_minutes)} min`}
              />
            </div>
          </div>

          {/* Volumen */}
          <div
            className="flex flex-col rounded-lg p-xl"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
            }}
          >
            <h3 className="text-base font-semibold text-fg mb-md m-0">Volumen</h3>
            <div className="flex flex-col">
              <StatRow label="Series totales" value={report.volume.total_sets} />
              <StatRow label="Reps totales" value={report.volume.total_reps} />
              <StatRow
                label="Volumen total"
                value={`${Math.round(report.volume.total_volume_kg).toLocaleString("es-AR")} kg`}
              />
              {report.volume.top_muscle_group && (
                <StatRow
                  label="Grupo muscular top"
                  value={`${report.volume.top_muscle_group.name} (${report.volume.top_muscle_group.sets} series)`}
                />
              )}
            </div>
          </div>

          {/* Distribución muscular */}
          {report.volume.muscle_group_breakdown.length > 0 && (
            <div
              className="flex flex-col rounded-lg p-xl"
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
              }}
            >
              <h3 className="text-base font-semibold text-fg mb-md m-0">
                Distribución muscular
              </h3>
              <div className="flex flex-col gap-sm">
                {report.volume.muscle_group_breakdown.slice(0, 8).map((group) => {
                  const pct = report.volume.total_sets > 0
                    ? Math.round((group.sets / report.volume.total_sets) * 100)
                    : 0;
                  return (
                    <div key={group.name} className="flex flex-col gap-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-fg">{group.name}</span>
                        <span className="text-xs text-fg-secondary">
                          {group.sets} series · {pct}%
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-pill overflow-hidden"
                        style={{ background: "var(--fill-tertiary)" }}
                      >
                        <div
                          className="h-full rounded-pill"
                          style={{
                            width: `${pct}%`,
                            background: "var(--primary)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Records personales del mes */}
          {report.personal_records.length > 0 && (
            <div
              className="flex flex-col rounded-lg p-xl"
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
              }}
            >
              <h3 className="text-base font-semibold text-fg mb-md m-0">
                Récords personales del mes
              </h3>
              <div className="flex flex-col gap-sm">
                {report.personal_records.map((pr) => (
                  <div
                    key={pr.exercise_id}
                    className="flex items-center justify-between gap-md py-sm"
                    style={{ borderBottom: "1px solid var(--separator-subtle)" }}
                  >
                    <span className="text-sm text-fg">{pr.exercise_name}</span>
                    <div className="flex items-center gap-sm">
                      <Badge variant="success" size="sm">
                        {pr.weight_kg} kg × {pr.reps} reps
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Racha */}
          <div
            className="flex items-center justify-between gap-md p-xl rounded-lg"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
            }}
          >
            <span className="text-sm font-medium text-fg">Racha del mes</span>
            <div className="flex gap-lg">
              <div className="flex flex-col items-center">
                <span className="text-xxl font-bold text-primary">
                  {report.streak.max_streak_this_month}
                </span>
                <span className="text-xs text-fg-tertiary">máx días</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xxl font-bold text-success">
                  {report.streak.current_streak}
                </span>
                <span className="text-xs text-fg-tertiary">actual</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
