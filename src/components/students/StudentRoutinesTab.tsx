"use client";

import React, { useEffect, useState } from "react";
import { Dumbbell, Edit2 } from "lucide-react";
import Link from "next/link";
import { listStudentRoutines } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonBox } from "@/components/ui/Skeleton";
import type { Routine } from "@/lib/api/types";

interface StudentRoutinesTabProps {
  studentId: number;
  coachId: number;
}

function RoutinesSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[1, 2, 3].map((i) => <SkeletonBox key={i} height={72} />)}
    </div>
  );
}

function formatStatus(status: string): { label: string; variant: "success" | "neutral" | "warning" } {
  switch (status) {
    case "active": return { label: "Activa", variant: "success" };
    case "archived": return { label: "Archivada", variant: "neutral" };
    default: return { label: "Borrador", variant: "warning" };
  }
}

/**
 * StudentRoutinesTab — lista completa de rutinas del alumno.
 * El botón "Editar" solo aparece si el coach es el creador.
 */
export const StudentRoutinesTab: React.FC<StudentRoutinesTabProps> = ({
  studentId,
  coachId,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listStudentRoutines(studentId);
        if (!cancelled) setRoutines(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "No se pudieron cargar las rutinas"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId]);

  if (loading) return <RoutinesSkeleton />;
  if (error) return <ErrorBanner message={error} />;

  if (routines.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell size={24} />}
        title="Sin rutinas"
        description="Este alumno no tiene rutinas asignadas todavía."
      />
    );
  }

  return (
    <div className="flex flex-col gap-md">
      {routines.map((routine) => {
        const isOwned = routine.created_by === coachId;
        const { label, variant } = formatStatus(routine.status);

        return (
          <div
            key={routine.id}
            className="flex items-center justify-between gap-md p-xl rounded-lg"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div className="flex flex-col gap-xs min-w-0 flex-1">
              <span className="text-base font-semibold text-fg truncate">
                {routine.title}
              </span>
              <div className="flex items-center gap-sm flex-wrap">
                <Badge variant={variant} size="sm">{label}</Badge>
                {routine.exercises && (
                  <span className="text-xs text-fg-tertiary">
                    {routine.exercises.length} ejercicio(s)
                  </span>
                )}
                {!isOwned && (
                  <Badge variant="neutral" size="sm">Read-only</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-sm flex-shrink-0">
              {isOwned ? (
                <Link href={`/students/${studentId}/routines/${routine.id}`}>
                  <Button variant="outline" size="sm" iconLeft={<Edit2 size={14} />}>
                    Editar
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="sm" disabled>
                  Solo lectura
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
