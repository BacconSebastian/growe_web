"use client";

import React, { useEffect, useState } from "react";
import { Activity, Dumbbell, TrendingUp, Calendar } from "lucide-react";
import {
  getStudentMonthlyReport,
  getConsistencyHeatmap,
  listStudentRoutines,
  type ConsistencyHeatmapResponse,
} from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonBox, SkeletonCircle } from "@/components/ui/Skeleton";
import { HeatmapGrid } from "./HeatmapGrid";
import type { Routine } from "@/lib/api/types";

interface StudentSummaryTabProps {
  studentId: number;
  coachId: number;
}

// ─── Stat mini ─────────────────────────────────────────────────────────────

interface MiniStatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor: string;
}

function MiniStat({ label, value, icon, iconColor }: MiniStatProps) {
  return (
    <div
      className="flex flex-col gap-sm p-lg rounded-md"
      style={{
        background: "var(--fill-tertiary)",
      }}
    >
      <div
        className="w-8 h-8 rounded-pill flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--fill-secondary)", color: iconColor }}
      >
        {icon}
      </div>
      <span className="text-xxl font-bold text-fg leading-none">{value}</span>
      <span className="text-xs text-fg-secondary">{label}</span>
    </div>
  );
}

// ─── Skeleton de la tab ────────────────────────────────────────────────────

function SummaryTabSkeleton() {
  return (
    <div className="flex flex-col gap-xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {[1, 2, 3, 4].map((i) => <SkeletonBox key={i} height={100} />)}
      </div>
      <SkeletonBox height={160} />
      <SkeletonBox height={200} />
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────

export const StudentSummaryTab: React.FC<StudentSummaryTabProps> = ({
  studentId,
  coachId,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState<ConsistencyHeatmapResponse | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [stats, setStats] = useState<{
    workoutDays: number;
    lastWorkout: string | null;
    totalVolume: number;
    topExercise: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [hm, report, ruts] = await Promise.all([
          getConsistencyHeatmap(studentId),
          getStudentMonthlyReport(studentId).catch(() => null),
          listStudentRoutines(studentId).catch(() => [] as Routine[]),
        ]);

        if (cancelled) return;

        setHeatmap(hm);
        setRoutines(Array.isArray(ruts) ? ruts : []);

        if (report) {
          const top = report.volume.muscle_group_breakdown[0]?.name ?? null;
          setStats({
            workoutDays: report.summary.workout_days,
            lastWorkout: null, // viene en RoutineLog
            totalVolume: report.volume.total_volume_kg,
            topExercise: top,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "No se pudo cargar el resumen"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [studentId]);

  if (loading) return <SummaryTabSkeleton />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="flex flex-col gap-xl">
      {/* Mini stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <MiniStat
          label="Días entrenados este mes"
          value={stats?.workoutDays ?? "—"}
          icon={<Activity size={16} />}
          iconColor="var(--success)"
        />
        <MiniStat
          label="Volumen mensual (kg)"
          value={stats?.totalVolume ? `${Math.round(stats.totalVolume).toLocaleString("es-AR")} kg` : "—"}
          icon={<TrendingUp size={16} />}
          iconColor="var(--primary)"
        />
        <MiniStat
          label="Grupo muscular top"
          value={stats?.topExercise ?? "—"}
          icon={<Dumbbell size={16} />}
          iconColor="var(--warning)"
        />
        <MiniStat
          label="Rutinas asignadas"
          value={routines.length}
          icon={<Calendar size={16} />}
          iconColor="var(--purple)"
        />
      </div>

      {/* Heatmap */}
      <div
        className="flex flex-col gap-lg p-xl rounded-lg"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <h3 className="text-base font-semibold text-fg m-0">
          Consistencia (últimas 14 semanas)
        </h3>
        {heatmap ? (
          <HeatmapGrid days={heatmap.days} />
        ) : (
          <p className="text-sm text-fg-secondary">Sin datos de consistencia</p>
        )}
      </div>

      {/* Rutinas asignadas */}
      <div
        className="flex flex-col rounded-lg"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <div
          className="px-xl py-lg"
          style={{ borderBottom: "1px solid var(--separator-subtle)" }}
        >
          <h3 className="text-base font-semibold text-fg m-0">
            Rutinas asignadas
          </h3>
        </div>
        <div className="flex flex-col">
          {routines.length === 0 ? (
            <p className="text-sm text-fg-secondary px-xl py-lg">
              El alumno no tiene rutinas asignadas
            </p>
          ) : (
            routines.slice(0, 6).map((routine, idx) => {
              const isOwned = routine.created_by === coachId;
              return (
                <div
                  key={routine.id}
                  className="flex items-center justify-between gap-md px-xl py-md"
                  style={
                    idx < routines.length - 1
                      ? { borderBottom: "1px solid var(--separator-subtle)" }
                      : undefined
                  }
                >
                  <div className="flex flex-col gap-xxs min-w-0">
                    <span className="text-sm font-medium text-fg truncate">
                      {routine.title}
                    </span>
                    {routine.exercises && (
                      <span className="text-xs text-fg-tertiary">
                        {routine.exercises.length} ejercicio(s)
                      </span>
                    )}
                  </div>
                  <Badge variant={isOwned ? "primary" : "neutral"} size="sm">
                    {isOwned ? "Creada por vos" : "Del alumno"}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
