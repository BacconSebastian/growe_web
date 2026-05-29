"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { RoutineEditor } from "@/components/routines/RoutineEditor";

/**
 * /routines/[id] — editar rutina propia del coach.
 */
export default function EditRoutinePage() {
  const params = useParams();
  const routineId = params?.id ? Number(params.id) : undefined;

  if (!routineId || isNaN(routineId)) {
    return (
      <div className="flex flex-col gap-lg">
        <p className="text-base text-fg-secondary">ID de rutina inválido.</p>
        <Link href="/routines" className="text-sm text-primary">
          Volver a rutinas
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-xs">
        <Link
          href="/routines"
          className="flex items-center gap-xxs text-sm text-fg-secondary hover:text-fg transition-colors"
          style={{ textDecoration: "none" }}
        >
          <ChevronLeft size={14} />
          Rutinas
        </Link>
        <span className="text-sm text-fg-tertiary">/</span>
        <span className="text-sm text-fg">Editar rutina</span>
      </div>

      <RoutineEditor mode="edit-own" routineId={routineId} />
    </div>
  );
}
