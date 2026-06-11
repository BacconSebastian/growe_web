"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Pagination } from "@/components/ui/Pagination";

export interface MetricDetailItem {
  id: number;
  name: string;
  initials: string;
  avatar_url: string | null;
  /** Texto secundario opcional (ej: "Racha 5 · 3 ent./sem."). */
  detail?: string | null;
}

interface MetricDetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  items: MetricDetailItem[];
  /** Texto del empty state. */
  emptyLabel?: string;
}

/** Alumnos por página. */
const PER_PAGE = 8;
/** Alto fijo de cada fila (px). */
const ROW_HEIGHT = 56;
/** Gap entre filas (px) — debe matchear la clase gap-xs. */
const ROW_GAP = 4;

/**
 * MetricDetailModal — lista paginada (8/pág) de alumnos detrás de una métrica.
 * El cuerpo tiene alto fijo para que la paginación quede siempre en el mismo lugar.
 */
export function MetricDetailModal({
  open,
  onClose,
  title,
  items,
  emptyLabel = "No hay alumnos en esta categoría",
}: MetricDetailModalProps) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visible = items.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {/* Lista — alto fijo (8 filas + gaps) para que la paginación no se mueva */}
      <div
        className="flex flex-col gap-xs"
        style={{ minHeight: PER_PAGE * ROW_HEIGHT + (PER_PAGE - 1) * ROW_GAP }}
      >
        {total === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-sm py-xxl text-center">
            <Users size={28} style={{ color: "var(--fg-tertiary)" }} />
            <p className="text-sm text-fg-secondary m-0">{emptyLabel}</p>
          </div>
        ) : (
          visible.map((item) => (
            <Link
              key={item.id}
              href={`/students/${item.id}`}
              className="no-underline hover:no-underline"
              onClick={onClose}
            >
              <div
                className="flex items-center gap-md px-md rounded-lg transition-colors duration-100 hover:bg-fill-tertiary"
                style={{ height: ROW_HEIGHT }}
              >
                <Avatar src={item.avatar_url} initials={item.initials} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg m-0 truncate no-underline">
                    {item.name}
                  </p>
                  {item.detail && (
                    <p className="text-xs text-fg-tertiary m-0 truncate no-underline">
                      {item.detail}
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={16}
                  className="text-fg-tertiary flex-shrink-0"
                />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Paginación — SIEMPRE visible (deshabilitada si hay una sola página) */}
      <div style={{ borderTop: "1px solid var(--separator-subtle)" }}>
        <Pagination
          page={currentPage}
          perPage={PER_PAGE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </Modal>
  );
}
