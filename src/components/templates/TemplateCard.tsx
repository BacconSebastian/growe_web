"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { CoachTemplate, TemplateDifficulty } from "@/lib/api/types";

interface TemplateCardProps {
  template: CoachTemplate;
  href: string;
}

const DIFFICULTY_LABELS: Record<TemplateDifficulty, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

const DIFFICULTY_BADGE_VARIANT: Record<
  TemplateDifficulty,
  "success" | "warning" | "danger"
> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "danger",
};

/**
 * TemplateCard — card de template para la lista /templates.
 * Espejo web del card de templates en mobile/app/coaching/templates/index.tsx.
 */
export const TemplateCard: React.FC<TemplateCardProps> = ({ template, href }) => {
  const isPlanning = template.type === "coach_planning";
  const routineCount = template.program_data?.routines?.length ?? 0;
  const weekCount = template.program_data?.weeks;

  return (
    <Link href={href} className="block group" style={{ textDecoration: "none", color: "inherit" }}>
      <div
        className="relative rounded-lg overflow-hidden border transition-transform group-hover:-translate-y-px"
        style={{
          background: "var(--card)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Overlay gradiente */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
          }}
        />

        <div className="relative p-xl flex flex-col gap-md">
          {/* Header: ícono + badge tipo */}
          <div className="flex items-start justify-between gap-md">
            <div
              className="w-10 h-10 rounded-pill flex items-center justify-center flex-shrink-0"
              style={{
                background: "var(--primary-alpha-12)",
                color: "var(--primary)",
              }}
            >
              {isPlanning ? <CalendarDays size={18} /> : <BookOpen size={18} />}
            </div>

            <Badge variant="primary" size="sm">
              {isPlanning ? "Planificación" : "Rutina"}
            </Badge>
          </div>

          {/* Nombre */}
          <h3
            className="text-base font-semibold text-fg m-0 leading-tight line-clamp-2"
            style={{ wordBreak: "break-word" }}
          >
            {template.name}
          </h3>

          {/* Descripción opcional */}
          {template.description && (
            <p className="text-sm text-fg-secondary m-0 line-clamp-2">
              {template.description}
            </p>
          )}

          {/* Pills de categoría y dificultad */}
          <div className="flex flex-wrap gap-xs">
            {template.category && (
              <Badge variant="neutral" size="sm">
                {template.category}
              </Badge>
            )}
            {template.difficulty_level && (
              <Badge
                variant={DIFFICULTY_BADGE_VARIANT[template.difficulty_level]}
                size="sm"
              >
                {DIFFICULTY_LABELS[template.difficulty_level]}
              </Badge>
            )}
          </div>

          {/* Footer de stats */}
          <p className="text-xs text-fg-tertiary m-0">
            {isPlanning && weekCount != null
              ? `${weekCount} ${weekCount === 1 ? "semana" : "semanas"}`
              : routineCount > 0
              ? `${routineCount} ${routineCount === 1 ? "rutina" : "rutinas"}`
              : null}
          </p>
        </div>
      </div>
    </Link>
  );
};
