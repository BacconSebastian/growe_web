"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { PlanningOverview } from "@/components/plannings/PlanningOverview";
import { getStudent } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import type { User } from "@/lib/api/types";

/**
 * /students/[id]/plannings/[planningId] — Editar planning del alumno (in-place, modelo nuevo).
 * Authorship: PlanningOverview deshabilita editar/borrar de rutinas con created_by !== user.id.
 */
export default function StudentPlanningPage() {
  const params = useParams();
  const studentId = params?.id ? Number(params.id) : undefined;
  const planningId = params?.planningId ? Number(params.planningId) : undefined;

  const [student, setStudent] = useState<User | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    getStudent(studentId)
      .then(setStudent)
      .catch((err) =>
        setStudentError(getErrorMessage(err, "No se pudo cargar el alumno."))
      );
  }, [studentId]);

  const studentName =
    student?.first_name
      ? `${student.first_name} ${student.last_name ?? ""}`.trim()
      : student?.username ?? "Alumno";

  if (!studentId || isNaN(studentId) || !planningId || isNaN(planningId)) {
    return (
      <div className="flex flex-col gap-xxl">
        <p className="text-sm text-fg-tertiary">Parámetros inválidos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xxl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-xs text-sm text-fg-secondary flex-wrap">
        <Link href="/students" className="hover:text-fg transition-colors">
          Alumnos
        </Link>
        <span>/</span>
        {studentId && (
          <>
            <Link
              href={`/students/${studentId}`}
              className="hover:text-fg transition-colors"
            >
              {student ? (
                studentName
              ) : (
                <span className="inline-block w-24">
                  <SkeletonLine height={14} />
                </span>
              )}
            </Link>
            <span>/</span>
          </>
        )}
        <span>Planificaciones</span>
        {studentError && (
          <span className="text-destructive text-xs ml-sm">{studentError}</span>
        )}
      </nav>

      <PlanningOverview
        mode="coach"
        studentId={studentId}
        planningId={planningId}
      />
    </div>
  );
}
