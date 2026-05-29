"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

interface PaginationProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Pagination — anterior/siguiente + info "X-Y de Z".
 */
export const Pagination: React.FC<PaginationProps> = ({
  page,
  perPage,
  total,
  onPageChange,
  className = "",
}) => {
  const totalPages = Math.ceil(total / perPage);
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div
      className={[
        "flex items-center justify-between gap-lg py-md px-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-sm text-fg-secondary">
        {total === 0 ? "Sin resultados" : `${from}–${to} de ${total}`}
      </span>

      <div className="flex items-center gap-sm">
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<ChevronLeft size={14} />}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          iconRight={<ChevronRight size={14} />}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
};
