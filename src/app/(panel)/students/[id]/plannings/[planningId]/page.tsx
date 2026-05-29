"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { PlanningEditor } from "@/components/plannings/PlanningEditor";
import { getStudent } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import type { User } from "@/lib/api/types";

/**
 * /students/[id]/plannings/[planningId] — Editar planning del alumno (in-place).
 * Solo editable si created_by === user.id (verificado dentro de PlanningEditor).
 */
export default function StudentPlanningPage() {
  const params = useParams();
  const studentId = params?.id ? Number(params.id) : undefined;
  const planningId = params?.planningId ? Number(params.planningId) : undefined;

  const [student, setStudent] = useState<User | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Cargar el nombre del alumno para el breadcrumb
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
              {student ? studentName : (
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

      <PlanningEditor
        mode="edit-coach"
        planningId={planningId}
        studentId={studentId}
        studentName={studentName}
      />
    </div>
  );
}
