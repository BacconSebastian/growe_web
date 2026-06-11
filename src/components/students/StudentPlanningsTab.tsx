"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, Copy } from "lucide-react";
import Link from "next/link";
import { listStudentPlannings, duplicateStudentPlanningToLibrary } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox } from "@/components/ui/Skeleton";
import type { Planning } from "@/lib/api/types";

interface StudentPlanningsTabProps {
  studentId: number;
  /** Opcional: el tab lo deriva del AuthContext si no se pasa */
  coachId?: number;
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
 * El botón "Duplicar a mi biblioteca" aparece solo si el coach es el creador.
 */
export const StudentPlanningsTab: React.FC<StudentPlanningsTabProps> = ({
  studentId,
  coachId: coachIdProp,
}) => {
  const { user } = useAuth();
  // Preferir coachId explícito (pasado por el host), si no, usar el usuario autenticado
  const coachId = coachIdProp ?? user?.id ?? 0;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [duplicateSuccess, setDuplicateSuccess] = useState<number | null>(null);

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

  const handleDuplicate = async (planningId: number) => {
    if (duplicatingId !== null) return;
    setDuplicatingId(planningId);
    setDuplicateError(null);
    setDuplicateSuccess(null);
    try {
      await duplicateStudentPlanningToLibrary(studentId, planningId);
      setDuplicateSuccess(planningId);
    } catch (err) {
      setDuplicateError(getErrorMessage(err, "No se pudo duplicar la planificación"));
    } finally {
      setDuplicatingId(null);
    }
  };

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
      {duplicateError && (
        <ErrorBanner message={duplicateError} />
      )}

      {sorted.map((planning) => {
        const { label, variant } = statusBadge(planning.status);
        const isActive = planning.status === "active";
        // Authorship: el coach solo puede duplicar plannings que él creó
        const isAuthor = planning.created_by === coachId;
        const weekCount = planning.weeks?.length ?? planning.total_weeks ?? 0;

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
              <div className="flex flex-col gap-xs min-w-0 flex-1">
                <span className="text-base font-semibold text-fg">
                  {planning.title}
                </span>
                <div className="flex items-center gap-sm flex-wrap">
                  <Badge variant={variant} size="sm">{label}</Badge>
                  {weekCount > 0 && (
                    <span className="text-xs text-fg-tertiary">
                      {weekCount} semana{weekCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {planning.current_week && isActive && weekCount > 0 && (
                    <span className="text-xs text-fg-secondary">
                      Semana {planning.current_week} / {weekCount}
                    </span>
                  )}
                  {!isAuthor && (
                    <Badge variant="neutral" size="sm">Read-only</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-sm flex-shrink-0 flex-wrap">
                {planning.start_date && (
                  <span className="text-xs text-fg-tertiary">
                    Inicio: {formatDate(planning.start_date)}
                  </span>
                )}

                {/* Ver / editar */}
                <Link href={`/students/${studentId}/plannings/${planning.id}`}>
                  <Button variant="outline" size="sm">
                    Ver
                  </Button>
                </Link>

                {/* Duplicar a mi biblioteca — solo si el coach es autor */}
                {isAuthor && (
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<Copy size={13} />}
                    loading={duplicatingId === planning.id}
                    disabled={duplicatingId !== null || duplicateSuccess === planning.id}
                    onClick={() => handleDuplicate(planning.id)}
                    title="Crear una copia en mi biblioteca"
                  >
                    {duplicateSuccess === planning.id ? "Duplicada" : "Duplicar"}
                  </Button>
                )}
              </div>
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
