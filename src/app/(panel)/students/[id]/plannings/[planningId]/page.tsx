"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PlanningOverview } from "@/components/plannings/PlanningOverview";
import { getStudent } from "@/lib/api/coaching";
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

  useEffect(() => {
    if (!studentId) return;
    getStudent(studentId)
      .then(setStudent)
      .catch(() => setStudent(null));
  }, [studentId]);

  const studentName = student?.first_name
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
      <PlanningOverview
        mode="coach"
        studentId={studentId}
        planningId={planningId}
        trail={[
          { label: "Alumnos", href: "/students" },
          { label: studentName, href: `/students/${studentId}` },
        ]}
      />
    </div>
  );
}
