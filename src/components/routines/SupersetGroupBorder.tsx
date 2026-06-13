"use client";

import React from "react";
import { Link2, Unlink2 } from "lucide-react";

interface SupersetGroupBorderProps {
  /** Número de ejercicios en el grupo (≥2). */
  exerciseCount: number;
  /** Callback para disolver el grupo superset. */
  onDissolve: () => void;
  children: React.ReactNode;
}

/**
 * SupersetGroupBorder — envuelve un cluster de ejercicios con borde ámbar y
 * etiqueta "Superset · N ejercicios". Botón de disolución a la derecha.
 *
 * Diseño: borde izquierdo ámbar (var(--warning)), header con ícono Link2,
 * botón Unlink2 para deshacer. Sin colores hex/rgba hardcodeados.
 */
export const SupersetGroupBorder: React.FC<SupersetGroupBorderProps> = ({
  exerciseCount,
  onDissolve,
  children,
}) => {
  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--warning-alpha-40)",
        borderLeft: "3px solid var(--warning)",
      }}
    >
      {/* Header del grupo */}
      <div
        className="flex items-center justify-between px-lg py-sm"
        style={{
          background: "var(--warning-alpha-08)",
          borderBottom: "1px solid var(--warning-alpha-20)",
        }}
      >
        <div className="flex items-center gap-xs">
          <Link2 size={14} style={{ color: "var(--warning)" }} />
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--warning)" }}
          >
            Superset · {exerciseCount} ejercicio{exerciseCount !== 1 ? "s" : ""}
          </span>
        </div>

        <button
          type="button"
          title="Deshacer superset"
          aria-label="Deshacer superset"
          onClick={onDissolve}
          className="flex items-center gap-xs rounded-pill px-sm py-[3px] text-xs font-semibold transition-opacity hover:opacity-70"
          style={{
            background: "var(--warning-alpha-12)",
            color: "var(--warning)",
            border: "1px solid var(--warning-alpha-30)",
          }}
        >
          <Unlink2 size={12} />
          Deshacer
        </button>
      </div>

      {/* Ejercicios del grupo */}
      <div className="flex flex-col gap-0">{children}</div>
    </div>
  );
};
