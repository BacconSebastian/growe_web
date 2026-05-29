"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ExerciseForm } from "@/components/exercises/ExerciseForm";

/**
 * /exercises/[id] — Editar ejercicio personalizado.
 */
export default function EditExercisePage() {
  const params = useParams<{ id: string }>();
  const exerciseId = Number(params.id);

  if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
    return (
      <div className="flex flex-col gap-lg">
        <p className="text-base text-destructive">ID de ejercicio inválido.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xxl">
      <div>
        <h1
          className="text-display font-bold tracking-tight"
          style={{ margin: 0, letterSpacing: "-0.4px" }}
        >
          Editar ejercicio
        </h1>
        <p className="text-base text-fg-secondary mt-xs m-0">
          Modificá el nombre, tipo o variables de tracking
        </p>
      </div>

      <ExerciseForm mode="edit" exerciseId={exerciseId} />
    </div>
  );
}
