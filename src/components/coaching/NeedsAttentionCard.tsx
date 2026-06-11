"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle, ChevronRight } from "lucide-react";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { getUserInitials } from "@/lib/utils";
import type { AttentionStudent } from "@/lib/api/coaching";

interface NeedsAttentionCardProps {
  students: AttentionStudent[];
}

/** Alumnos por página. */
const PER_PAGE = 5;
/** Alto fijo de cada fila (px). */
const ROW_HEIGHT = 76;

export function NeedsAttentionCard({ students }: NeedsAttentionCardProps) {
  const [page, setPage] = useState(1);

  const total = students.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  // Clamp defensivo: si la lista se achica tras un refresh, no quedar fuera de rango.
  const currentPage = Math.min(page, totalPages);
  const visible = students.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  return (
    <GradientSurface className="lg:col-span-2">
      {/* Header */}
      <div
        className="flex items-center justify-between px-xl py-lg"
        style={{ borderBottom: "1px solid var(--separator-subtle)" }}
      >
        <h2 className="text-base font-semibold text-fg m-0">
          Necesitan atención
        </h2>
        {total > 0 && (
          <Badge variant="danger" size="sm">
            {total}
          </Badge>
        )}
      </div>

      {/* Body — flex-1 para empujar la paginación al fondo cuando la grilla
          estira la card; minHeight (5 filas) como piso para que no colapse */}
      <div
        className="flex flex-col flex-1"
        style={{ minHeight: PER_PAGE * ROW_HEIGHT }}
      >
        {total === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-sm px-xl py-xxl text-center">
            <CheckCircle size={28} style={{ color: "var(--success)" }} />
            <p className="text-sm text-fg-secondary m-0">
              Ningún alumno necesita atención
            </p>
          </div>
        ) : (
          visible.map((s, idx) => {
            const name =
              `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.username;
            const initials = getUserInitials({
              first_name: s.first_name,
              last_name: s.last_name,
              username: s.username,
            });

            // La rutina comentada navega a su detalle (1 comentario → esa rutina;
            // varios → al perfil del alumno, donde ve todas).
            const commentedCount = s.commented_routines.length;
            const commentedHref =
              commentedCount === 1
                ? `/students/${s.id}/routines/${s.commented_routines[0].routine_id}`
                : `/students/${s.id}`;

            return (
              <div
                key={s.id}
                className="flex items-center gap-md px-xl py-lg min-h-[76px]"
                style={
                  idx < visible.length - 1
                    ? { borderBottom: "1px solid var(--separator-subtle)" }
                    : undefined
                }
              >
                {/* Avatar */}
                <Avatar src={s.avatar_url} initials={initials} size="md" />

                {/* Info: nombre + fila de badges (incluye @usuario) */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg m-0 truncate">
                    {name}
                  </p>
                  <div className="flex flex-wrap items-center gap-xs mt-xxs">
                    <Badge variant="neutral" size="sm">
                      @{s.username}
                    </Badge>
                    {s.inactive && (
                      <Badge variant="danger" size="sm">
                        Inactivo
                        {s.inactive_days != null ? ` · ${s.inactive_days}d` : ""}
                      </Badge>
                    )}
                    {s.without_planning && (
                      <Badge variant="danger" size="sm">
                        Sin planificación
                      </Badge>
                    )}
                    {commentedCount > 0 && (
                      <Link href={commentedHref} className="no-underline">
                        <Badge variant="warning" size="sm">
                          Comentó {commentedCount} rutina
                          {commentedCount !== 1 ? "s" : ""}
                        </Badge>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Acción única — mantiene las cards del mismo alto */}
                <Link
                  href={`/students/${s.id}`}
                  className="no-underline flex-shrink-0"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    iconRight={<ChevronRight size={14} />}
                  >
                    Ver perfil
                  </Button>
                </Link>
              </div>
            );
          })
        )}
      </div>

      {/* Paginación — siempre visible (deshabilitada si hay una sola página) */}
      <div style={{ borderTop: "1px solid var(--separator-subtle)" }}>
        <Pagination
          page={currentPage}
          perPage={PER_PAGE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </GradientSurface>
  );
}
