"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Dumbbell, CalendarDays, ChevronRight, FileText } from "lucide-react";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { Pagination } from "@/components/ui/Pagination";

export interface DraftItem {
  type: "routine" | "planning";
  id: number;
  title: string;
}

interface DraftsCardProps {
  items: DraftItem[];
  className?: string;
}

/** Borradores por página. */
const PER_PAGE = 2;
/** Alto fijo de cada fila (px). */
const ROW_HEIGHT = 64;

export function DraftsCard({ items, className }: DraftsCardProps) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visible = items.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  return (
    <GradientSurface className={className}>
      {/* Header */}
      <div
        className="px-xl py-lg"
        style={{ borderBottom: "1px solid var(--separator-subtle)" }}
      >
        <h2 className="text-base font-semibold text-fg m-0">
          Borradores pendientes
        </h2>
      </div>

      {/* Body — alto mínimo (PER_PAGE filas) para que la paginación quede siempre
          en el mismo lugar sin importar la cantidad de borradores */}
      <div
        className="flex flex-col"
        style={{ minHeight: PER_PAGE * ROW_HEIGHT }}
      >
        {total === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-sm px-xl py-xxl text-center">
            <FileText size={26} style={{ color: "var(--fg-tertiary)" }} />
            <p className="text-sm text-fg-secondary m-0">
              No hay borradores pendientes
            </p>
          </div>
        ) : (
          visible.map((item, idx) => {
            const isRoutine = item.type === "routine";
            const href = isRoutine
              ? `/routines/${item.id}`
              : `/plannings/${item.id}`;

            return (
              <Link key={`${item.type}-${item.id}`} href={href} className="no-underline">
                <div
                  className="flex items-center gap-md px-xl transition-colors duration-100"
                  style={{
                    height: ROW_HEIGHT,
                    ...(idx < visible.length - 1
                      ? { borderBottom: "1px solid var(--separator-subtle)" }
                      : {}),
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "var(--fill-quaternary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "";
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-pill flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isRoutine
                        ? "var(--warning-alpha-20)"
                        : "var(--purple-alpha-16)",
                      color: isRoutine ? "var(--warning)" : "var(--purple)",
                    }}
                  >
                    {isRoutine ? (
                      <Dumbbell size={18} />
                    ) : (
                      <CalendarDays size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg m-0 truncate">
                      {item.title || "(Sin título)"}
                    </p>
                    <p className="text-xs text-fg-tertiary m-0">
                      {isRoutine ? "Rutina" : "Planificación"}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-fg-tertiary flex-shrink-0"
                  />
                </div>
              </Link>
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
