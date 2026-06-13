"use client";

import React, { useEffect, useState } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatTimerTime, parseTimerInput } from "@/lib/timer";

interface RestTimerModalProps {
  open: boolean;
  /** Segundos actuales (null = sin descanso). */
  initialSeconds: number | null;
  onClose: () => void;
  /** Guarda el descanso en segundos (0 = sin descanso). */
  onSave: (seconds: number) => void;
}

const STEP = 10; // segundos por tap en −/+

/**
 * RestTimerModal — configura el descanso de una serie con display MM:SS y
 * ajuste ±10s (mismo layout que el timer de mobile).
 */
export function RestTimerModal({
  open,
  initialSeconds,
  onClose,
  onSave,
}: RestTimerModalProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setValue(initialSeconds ? formatTimerTime(initialSeconds) : "00:00");
    }
  }, [open, initialSeconds]);

  const seconds = parseTimerInput(value, 0);

  const adjust = (delta: number) => {
    const next = Math.max(0, seconds + delta);
    setValue(formatTimerTime(next));
  };

  const handleSave = () => {
    onSave(parseTimerInput(value, 0));
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Descanso de la serie" size="sm">
      <div className="flex flex-col gap-xl py-sm">
        {/* Display: − [MM:SS] + */}
        <div className="flex items-center justify-center gap-lg">
          <AdjustButton
            ariaLabel="Restar 10 segundos"
            disabled={seconds <= 0}
            onClick={() => adjust(-STEP)}
          >
            <Minus size={20} />
          </AdjustButton>

          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="MM:SS"
            maxLength={5}
            className="w-[180px] text-center bg-transparent text-fg outline-none tabular-nums"
            style={{ fontSize: "40px", fontWeight: 800, letterSpacing: "0.5px" }}
            aria-label="Tiempo de descanso (MM:SS)"
          />

          <AdjustButton ariaLabel="Sumar 10 segundos" onClick={() => adjust(STEP)}>
            <Plus size={20} />
          </AdjustButton>
        </div>

        {/* Guardar */}
        <Button
          type="button"
          variant="primary"
          size="md"
          className="w-full"
          iconLeft={<Check size={16} />}
          onClick={handleSave}
        >
          Guardar
        </Button>
      </div>
    </Modal>
  );
}

/** Botón circular de ajuste con el gradiente característico. */
const AdjustButton: React.FC<{
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ ariaLabel, disabled, onClick, children }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={onClick}
    className="relative w-12 h-12 rounded-pill overflow-hidden flex items-center justify-center flex-shrink-0 border transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    style={{ borderColor: "var(--card-border-light)", color: "var(--fg)" }}
  >
    <span
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
      }}
    />
    <span className="relative flex items-center justify-center">{children}</span>
  </button>
);
