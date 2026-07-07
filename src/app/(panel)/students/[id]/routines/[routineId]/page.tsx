"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RoutineEditor } from "@/components/routines/RoutineEditor";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { getStudent } from "@/lib/api/coaching";
import { getStudentRoutine } from "@/lib/api/coaching";
import { getDisplayName } from "@/lib/utils";
import { useAliases } from "@/contexts/AliasContext";
import type { User } from "@/lib/api/types";

/**
 * /students/[id]/routines/[routineId] — editar rutina del alumno in-place.
 *
 * El RoutineEditor valida el authorship internamente y muestra banner read-only
 * si created_by !== user.id.
 */
export default function StudentRoutineEditorPage() {
  const params = useParams();
  const studentId = params?.id ? Number(params.id) : undefined;
  const routineId = params?.routineId ? Number(params.routineId) : undefined;

  const { aliases } = useAliases();
  const [student, setStudent] = useState<User | null>(null);
  const [routineTitle, setRoutineTitle] = useState<string | null>(null);
  const [loadingHeader, setLoadingHeader] = useState(true);

  useEffect(() => {
    if (!studentId || isNaN(studentId)) {
      setLoadingHeader(false);
      return;
    }

    Promise.all([
      getStudent(studentId).catch(() => null),
      routineId && !isNaN(routineId)
        ? getStudentRoutine(studentId, routineId).catch(() => null)
        : Promise.resolve(null),
    ]).then(([s, r]) => {
      if (s) setStudent(s);
      if (r) setRoutineTitle(r.title);
      setLoadingHeader(false);
    });
  }, [studentId, routineId]);

  if (!studentId || isNaN(studentId) || !routineId || isNaN(routineId)) {
    return (
      <div className="flex flex-col gap-lg">
        <p className="text-base text-fg-secondary">Parámetros inválidos en la URL.</p>
        <Link href="/students" className="text-sm text-primary">
          Volver a alumnos
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-xs flex-wrap">
        <Link
          href="/students"
          className="flex items-center gap-xxs text-sm text-fg-secondary hover:text-fg transition-colors"
          style={{ textDecoration: "none" }}
        >
          <ChevronLeft size={14} />
          Alumnos
        </Link>
        <span className="text-sm text-fg-tertiary">/</span>

        {loadingHeader ? (
          <SkeletonLine width={80} height={14} />
        ) : (
          <Link
            href={`/students/${studentId}`}
            className="text-sm text-fg-secondary hover:text-fg transition-colors"
            style={{ textDecoration: "none" }}
          >
            {student ? getDisplayName(student, aliases) : `Alumno ${studentId}`}
          </Link>
        )}

        <span className="text-sm text-fg-tertiary">/</span>
        <span className="text-sm text-fg-secondary">Rutinas</span>
        <span className="text-sm text-fg-tertiary">/</span>

        {loadingHeader ? (
          <SkeletonLine width={120} height={14} />
        ) : (
          <span className="text-sm text-fg">
            {routineTitle ?? `Rutina ${routineId}`}
          </span>
        )}
      </div>

      {/* Editor */}
      <RoutineEditor
        mode="edit-coach"
        routineId={routineId}
        studentId={studentId}
      />
    </div>
  );
}
