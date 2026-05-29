"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface WeekSelectorProps {
  currentWeek: number;
  totalWeeks: number;
  actualCurrentWeek: number; // semana actual según la planning (para marcarla)
  readOnly?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onCopyWeek?: () => void;
  onApplyAll?: () => void;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  currentWeek,
  totalWeeks,
  actualCurrentWeek,
  readOnly = false,
  onPrev,
  onNext,
  onCopyWeek,
  onApplyAll,
}) => {
  const isActual = currentWeek === actualCurrentWeek;

  return (
    <div
      className="flex items-center justify-between gap-md flex-wrap p-xl rounded-lg"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
      }}
    >
      {/* Selector de semana */}
      <div className="flex items-center gap-sm">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentWeek <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-secondary hover:text-fg disabled:opacity-40 transition-colors"
          style={{ background: "var(--fill-tertiary)" }}
          aria-label="Semana anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div
          className="flex items-center gap-xs px-md rounded-md text-base font-semibold"
          style={{
            background: "var(--fill-tertiary)",
            height: "36px",
            color: isActual ? "var(--primary)" : "var(--fg)",
            minWidth: "140px",
            justifyContent: "center",
          }}
        >
          Semana {currentWeek}
          {isActual && (
            <span
              className="text-xs font-medium rounded-pill px-xs"
              style={{
                background: "var(--primary-alpha-16)",
                color: "var(--primary)",
              }}
            >
              actual
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={currentWeek >= totalWeeks}
          className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-secondary hover:text-fg disabled:opacity-40 transition-colors"
          style={{ background: "var(--fill-tertiary)" }}
          aria-label="Semana siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Acciones de semana */}
      {!readOnly && (
        <div className="flex gap-sm">
          {onCopyWeek && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onCopyWeek}
              iconLeft={<Copy size={14} />}
            >
              Copiar semana
            </Button>
          )}
          {onApplyAll && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onApplyAll}
            >
              Aplicar a todas
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
