"use client";

import React from "react";
import { Dumbbell } from "lucide-react";
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

/** Alto fijo de la card (px) — mismo alto que las cards de rutinas. */
export const EXERCISE_CARD_HEIGHT = 176;

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
  /** Slot para botones de acción (Editar, Eliminar, etc.) */
  actions?: React.ReactNode;
}

/**
 * ExerciseCard — card de ejercicio con gradiente característico y alto fijo.
 * Header (ícono + nombre + tipo), grupos musculares y slot de acciones al pie.
 */
export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, actions }) => {
  const typeLabel = exercise.exercise_type
    ? TYPE_LABEL[exercise.exercise_type] ?? exercise.exercise_type
    : null;
  const typeVariant = exercise.exercise_type
    ? TYPE_VARIANT[exercise.exercise_type] ?? "neutral"
    : "neutral";

  const muscleGroups = exercise.muscle_groups ?? [];

  return (
    <div
      className="relative rounded-lg overflow-hidden border"
      style={{
        height: EXERCISE_CARD_HEIGHT,
        borderColor: "var(--card-border-light)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Overlay gradiente característico */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
        }}
      />

      <div className="relative p-xl flex flex-col h-full">
        {/* Header: ícono + nombre + tipo */}
        <div className="flex items-start justify-between gap-sm">
          <div className="flex items-center gap-sm min-w-0">
            <div
              className="w-9 h-9 rounded-pill flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--primary-alpha-12)" }}
            >
              <Dumbbell size={16} style={{ color: "var(--primary)" }} />
            </div>
            <span className="text-base font-semibold text-fg leading-tight line-clamp-2">
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
          <div className="flex flex-wrap gap-xs mt-md">
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

        {/* Acciones (al pie) */}
        {actions && (
          <div
            className="mt-auto flex items-center gap-sm pt-md"
            style={{ borderTop: "1px solid var(--separator-subtle)" }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
