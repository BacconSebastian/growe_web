"use client";

import React from "react";
import Link from "next/link";
import { Users, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { TrainingGroup } from "@/lib/api/types";

interface GroupCardProps {
  group: TrainingGroup;
}

/**
 * GroupCard — tarjeta de un grupo de entrenamiento en la lista.
 */
export const GroupCard: React.FC<GroupCardProps> = ({ group }) => {
  return (
    <Link href={`/groups/${group.id}`} className="block no-underline">
      <div
        className="rounded-lg p-xl flex items-center gap-lg transition-opacity hover:opacity-90 cursor-pointer"
        style={{
          background: "var(--card)",
          border: "1px solid var(--separator-subtle)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Ícono del grupo */}
        <div
          className="w-11 h-11 rounded-pill flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--primary-alpha-12)" }}
        >
          <Users size={20} style={{ color: "var(--primary)" }} />
        </div>

        {/* Contenido */}
        <div className="flex flex-col gap-xs flex-1 min-w-0">
          <span className="text-base font-semibold text-fg truncate">{group.name}</span>
          {group.description ? (
            <span className="text-sm text-fg-secondary truncate">{group.description}</span>
          ) : null}
          <div className="flex items-center gap-sm flex-wrap mt-xxs">
            <span className="text-xs text-fg-tertiary flex items-center gap-xs">
              <Users size={11} />
              {group.member_count} {group.member_count === 1 ? "alumno" : "alumnos"}
            </span>
            {group.assigned_planning_title ? (
              <Badge variant="primary" size="sm">
                <span className="flex items-center gap-xxs">
                  <BookOpen size={10} />
                  {group.assigned_planning_title}
                </span>
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Flecha derecha */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ color: "var(--fg-quaternary)", flexShrink: 0 }}
        >
          <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
};
