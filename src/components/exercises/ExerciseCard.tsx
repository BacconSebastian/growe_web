"use client";

import React from "react";
import { Dumbbell } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ExerciseCatalogItem } from "@/lib/api/exercises";
import type { VariablesConfig } from "@/lib/api/types";

// Tipos extendidos para el panel de ejercicios
export interface ExerciseCardItem extends ExerciseCatalogItem {
  exercise_type?: string | null;
  muscle_groups?: string[] | null;
  variables_config?: VariablesConfig | null;
  description?: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  weight: "Peso",
  timed: "Tiempo",
  superset: "Superset",
  custom: "Custom",
};

const TYPE_VARIANT: Record<string, "neutral" | "primary" | "purple" | "warning"> = {
  weight: "neutral",
  timed: "primary",
  superset: "purple",
  custom: "warning",
};

interface ExerciseCardProps {
  exercise: ExerciseCardItem;
  /** Slot para botones de acción (Editar, Eliminar, Duplicar, etc.) */
  actions?: React.ReactNode;
}

/**
 * ExerciseCard — card de un ejercicio en la lista.
 * Muestra nombre, tipo, grupos musculares y preview de variables.
 * El slot `actions` admite cualquier ReactNode (botones, etc.).
 */
export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, actions }) => {
  const typeLabel = exercise.exercise_type ? TYPE_LABEL[exercise.exercise_type] ?? exercise.exercise_type : null;
  const typeVariant = exercise.exercise_type ? (TYPE_VARIANT[exercise.exercise_type] ?? "neutral") : "neutral";

  // Preview de variables: "Reps, Peso, RIR" o nombres custom
  const varLabels =
    exercise.variables_config?.variables
      ?.map((v) => v.label ?? v.key)
      ?.join(", ") ?? null;

  const muscleGroups = exercise.muscle_groups ?? [];

  return (
    <Card className="flex flex-col gap-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-sm">
        <div className="flex items-center gap-sm min-w-0">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--primary-alpha-12)" }}
          >
            <Dumbbell size={16} style={{ color: "var(--primary)" }} />
          </div>
          <span className="text-base font-semibold text-fg leading-tight truncate">
            {exercise.name}
          </span>
        </div>
        {typeLabel && (
          <Badge variant={typeVariant} size="sm">
            {typeLabel}
          </Badge>
        )}
      </div>

      {/* Grupos musculares */}
      {muscleGroups.length > 0 && (
        <div className="flex flex-wrap gap-xs">
          {muscleGroups.map((mg) => (
            <span
              key={mg}
              className="text-xs px-sm py-xxs rounded-pill font-medium"
              style={{
                background: "var(--fill-tertiary)",
                color: "var(--fg-secondary)",
              }}
            >
              {mg}
            </span>
          ))}
        </div>
      )}

      {/* Variables preview */}
      {varLabels && (
        <p className="text-sm text-fg-secondary m-0 leading-snug">{varLabels}</p>
      )}

      {/* Descripción (preview truncada) */}
      {exercise.description && (
        <p
          className="text-sm text-fg-tertiary m-0 leading-snug"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {exercise.description}
        </p>
      )}

      {/* Acciones */}
      {actions && (
        <div
          className="flex items-center gap-sm pt-sm"
          style={{ borderTop: "1px solid var(--separator-subtle)" }}
        >
          {actions}
        </div>
      )}
    </Card>
  );
};
