"use client";

import React from "react";
import { Link2, Unlink2 } from "lucide-react";

/**
 * SupersetGroupSection — contenedor visual de un cluster de ejercicios combinados.
 *
 * Replica el estilo de mobile/components/workout/SupersetGroupBorder.tsx:
 * - Acento ámbar vertical a la izquierda (barra de 3px, rounded-full).
 * - Chip pill "Superset · N ejercicios" con fondo e ícono ámbar.
 * - Botón "Separar" dentro del chip (solo si !combineMode && !readOnly && onUngroup).
 * - Children (ExerciseBlock) como cards apiladas en gap-sm.
 *
 * NO envuelve en una caja con borde — evita el patrón "caja dentro de caja"
 * prohibido por web/CLAUDE.md §Superset.
 */

interface SupersetGroupSectionProps {
  /** Número de ejercicios (grupos de variantes) en el cluster (≥1). */
  memberCount: number;
  /** Si true, el editor está en modo "seleccionar para combinar". */
  combineMode?: boolean;
  /** Si true, los controles de edición están deshabilitados. */
  readOnly?: boolean;
  /** Disuelve el superset completo. Solo se muestra si !combineMode && !readOnly. */
  onUngroup?: () => void;
  children: React.ReactNode;
}

export const SupersetGroupSection: React.FC<SupersetGroupSectionProps> = ({
  memberCount,
  combineMode = false,
  readOnly = false,
  onUngroup,
  children,
}) => {
  return (
    <div className="flex gap-sm">
      {/* Acento ámbar vertical redondeado (estilo mobile) */}
      <div
        className="w-[3px] rounded-full self-stretch flex-shrink-0"
        style={{
          background: combineMode ? "var(--separator)" : "var(--warning)",
          opacity: combineMode ? 1 : 0.8,
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col gap-sm">
        {/* Chip pill "Superset · N ejercicios" */}
        <div
          className="self-start inline-flex items-center gap-sm pl-md pr-xs py-xxs rounded-pill"
          style={{
            background: "var(--warning-alpha-12)",
            border: "1px solid var(--warning-alpha-30)",
          }}
        >
          <span className="flex items-center gap-xs">
            <Link2 size={14} style={{ color: "var(--warning)" }} />
            <span
              className="text-xs font-semibold tracking-wide whitespace-nowrap"
              style={{ color: "var(--warning)" }}
            >
              Superset · {memberCount}{" "}
              {memberCount === 1 ? "ejercicio" : "ejercicios"}
            </span>
          </span>

          {/* Separar — solo visible fuera del modo combinar, no readOnly, con handler */}
          {!combineMode && !readOnly && onUngroup && (
            <>
              <span
                className="w-px h-4 flex-shrink-0"
                style={{ background: "var(--warning-alpha-30)" }}
              />
              <button
                type="button"
                title="Separar superset"
                aria-label="Separar superset"
                onClick={onUngroup}
                className="flex items-center justify-center w-6 h-6 rounded-pill transition-opacity hover:opacity-80 flex-shrink-0"
                style={{
                  color: "var(--destructive)",
                  background: "var(--destructive-alpha-12)",
                }}
              >
                <Unlink2 size={13} />
              </button>
            </>
          )}
        </div>

        {/* Cards de los ejercicios del grupo */}
        <div className="flex flex-col gap-sm">{children}</div>
      </div>
    </div>
  );
};
