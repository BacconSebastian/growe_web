"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Días enteros desde una fecha ISO. Devuelve null si la fecha es null. */
function getDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function formatTimeAgo(dateStr: string | null): string {
  const days = getDaysSince(dateStr);
  if (days === null) return "Sin entrenos";
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`;
  return `Hace ${Math.floor(days / 30)} mes(es)`;
}

/**
 * Devuelve el label del badge de actividad con prefijo gramaticalmente
 * correcto. "Sin entrenos" se pasa tal cual; el resto lleva prefijo.
 */
function formatActivityBadge(dateStr: string | null): string {
  const raw = formatTimeAgo(dateStr);
  if (raw === "Sin entrenos") return raw;
  const lower = raw.charAt(0).toLowerCase() + raw.slice(1);
  return `Última actividad ${lower}`;
}

/**
 * Color del badge de actividad según días transcurridos:
 * null → danger (rojo), 0-3 → success (verde), 4-7 → warning (naranja), >7 → danger (rojo).
 */
function getActivityBadgeVariant(
  dateStr: string | null
): "success" | "warning" | "danger" {
  const days = getDaysSince(dateStr);
  if (days === null) return "danger";
  if (days <= 3) return "success";
  if (days <= 7) return "warning";
  return "danger";
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface StudentBadgesProps {
  lastWorkoutAt: string | null;
  activePlanningTitle: string | null;
}

/**
 * StudentBadges — par de badges reutilizable (actividad + planificación).
 * Se usa en la vista "Todos los alumnos" y en GroupMembersPanel.
 */
export const StudentBadges: React.FC<StudentBadgesProps> = ({
  lastWorkoutAt,
  activePlanningTitle,
}) => {
  return (
    <div className="flex items-center gap-xs flex-wrap">
      <Badge variant={getActivityBadgeVariant(lastWorkoutAt)} size="sm">
        {formatActivityBadge(lastWorkoutAt)}
      </Badge>
      <Badge
        variant={activePlanningTitle ? "neutral" : "danger"}
        size="sm"
      >
        {activePlanningTitle
          ? `Planificación asignada: ${activePlanningTitle}`
          : "Sin planificación"}
      </Badge>
    </div>
  );
};
