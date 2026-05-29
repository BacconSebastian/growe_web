"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { listStudentPlannings } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox } from "@/components/ui/Skeleton";
import type { Planning } from "@/lib/api/types";

interface StudentPlanningsTabProps {
  studentId: number;
}

function PlanningsSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[1, 2].map((i) => <SkeletonBox key={i} height={100} />)}
    </div>
  );
}

type PlanningStatus = Planning["status"];

function statusBadge(status: PlanningStatus): { label: string; variant: "success" | "primary" | "neutral" | "warning" | "danger" } {
  switch (status) {
    case "active":    return { label: "Activa", variant: "success" };
    case "scheduled": return { label: "Programada", variant: "primary" };
    case "draft":     return { label: "Borrador", variant: "neutral" };
    case "completed": return { label: "Completada", variant: "warning" };
    case "archived":  return { label: "Archivada", variant: "danger" };
    default:          return { label: status, variant: "neutral" };
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * StudentPlanningsTab — lista de plannings del alumno con status badge.
 */
export const StudentPlanningsTab: React.FC<StudentPlanningsTabProps> = ({
  studentId,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plannings, setPlannings] = useState<Planning[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listStudentPlannings(studentId);
        if (!cancelled) setPlannings(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "No se pudieron cargar las planificaciones"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId]);

  if (loading) return <PlanningsSkeleton />;
  if (error) return <ErrorBanner message={error} />;

  if (plannings.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={24} />}
        title="Sin planificaciones"
        description="Este alumno no tiene planificaciones asignadas todavía."
      />
    );
  }

  // Ordenar: activa primero, luego scheduled, resto
  const order: Record<string, number> = { active: 0, scheduled: 1, draft: 2, completed: 3, archived: 4 };
  const sorted = [...plannings].sort(
    (a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99)
  );

  return (
    <div className="flex flex-col gap-md">
      {sorted.map((planning) => {
        const { label, variant } = statusBadge(planning.status);
        const isActive = planning.status === "active";

        return (
          <div
            key={planning.id}
            className="flex flex-col gap-md p-xl rounded-lg"
            style={{
              background: "var(--card)",
              border: isActive
                ? "1px solid var(--primary)"
                : "1px solid var(--card-border)",
              boxShadow: isActive ? "var(--shadow-elevated)" : "var(--shadow-card)",
            }}
          >
            <div className="flex items-start justify-between gap-md flex-wrap">
              <div className="flex flex-col gap-xs min-w-0">
                <span className="text-base font-semibold text-fg">
                  {planning.title}
                </span>
                <div className="flex items-center gap-sm flex-wrap">
                  <Badge variant={variant} size="sm">{label}</Badge>
                  <span className="text-xs text-fg-tertiary">
                    {planning.total_weeks} semana(s)
                  </span>
                  {planning.current_week && isActive && (
                    <span className="text-xs text-fg-secondary">
                      Semana {planning.current_week} / {planning.total_weeks}
                    </span>
                  )}
                </div>
              </div>

              {planning.start_date && (
                <span className="text-xs text-fg-tertiary flex-shrink-0">
                  Inicio: {formatDate(planning.start_date)}
                </span>
              )}
            </div>

            {/* Grid de días target si tiene */}
            {isActive && planning.target_days && planning.target_days.length > 0 && (
              <div className="flex gap-xs flex-wrap">
                {planning.target_days.map((day) => (
                  <span
                    key={day}
                    className="text-xs font-medium px-sm py-xxs rounded-pill"
                    style={{
                      background: "var(--primary-alpha-12)",
                      color: "var(--primary)",
                    }}
                  >
                    {day.slice(0, 3).toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
