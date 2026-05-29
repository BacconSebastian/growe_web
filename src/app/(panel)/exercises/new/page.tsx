"use client";

import React from "react";
import { ExerciseForm } from "@/components/exercises/ExerciseForm";

/**
 * /exercises/new — Crear nuevo ejercicio personalizado.
 */
export default function NewExercisePage() {
  return (
    <div className="flex flex-col gap-xxl">
      <div>
        <h1
          className="text-display font-bold tracking-tight"
          style={{ margin: 0, letterSpacing: "-0.4px" }}
        >
          Nuevo ejercicio
        </h1>
        <p className="text-base text-fg-secondary mt-xs m-0">
          Creá un ejercicio personalizado para usar en tus rutinas
        </p>
      </div>

      <ExerciseForm mode="create" />
    </div>
  );
}
