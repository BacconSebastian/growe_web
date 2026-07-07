"use client";

import React from "react";
import { Link2, Unlink2, Shuffle } from "lucide-react";

/**
 * SupersetGroupSection — contenedor visual de un cluster de ejercicios combinados
 * o un grupo de variantes (suplentes).
 *
 * Replica el estilo de mobile/components/workout/SupersetGroupBorder.tsx:
 *
 * variant="superset" (default):
 *   - Acento ámbar vertical a la izquierda (barra de 3px, rounded-full).
 *   - Chip pill "Superset · N ejercicios" con fondo e ícono ámbar.
 *   - Botón "Separar" dentro del chip (solo si !combineMode && !readOnly && onUngroup).
 *
 * variant="variants":
 *   - Acento azul vertical a la izquierda (mismo tamaño, color primary).
 *   - Chip pill "Variantes" con fondo e ícono azul (Shuffle).
 *   - Sin botón "Separar" en el web (operación no implementada en los editores).
 *
 * Children (ExerciseBlock) como cards apiladas en gap-sm en ambos casos.
 * NO envuelve en una caja con borde — evita el patrón "caja dentro de caja"
 * prohibido por web/CLAUDE.md §Superset.
 */

interface SupersetGroupSectionProps {
  /** Número de ejercicios (grupos de variantes) en el cluster (≥1). */
  memberCount: number;
  /**
   * Modo visual del grupo.
   * - "superset" (default): chip ámbar, ícono Link2, texto "Superset · N ejercicios".
   * - "variants": chip azul, ícono Shuffle, texto "Variantes".
   */
  variant?: "superset" | "variants";
  /** Si true, el editor está en modo "seleccionar para combinar". */
  combineMode?: boolean;
  /** Si true, los controles de edición están deshabilitados. */
  readOnly?: boolean;
  /** Disuelve el superset completo. Solo se muestra si !combineMode && !readOnly && variant="superset". */
  onUngroup?: () => void;
  children: React.ReactNode;
}

export const SupersetGroupSection: React.FC<SupersetGroupSectionProps> = ({
  memberCount,
  variant = "superset",
  combineMode = false,
  readOnly = false,
  onUngroup,
  children,
}) => {
  const isVariants = variant === "variants";

  // Tokens de acento según variant — espejo de mobile SupersetGroupBorder.
  const accent = isVariants
    ? {
        solid: "var(--primary)",
        alphaBg: "var(--primary-alpha-12)",
        alphaBorder: "var(--primary-alpha-30)",
      }
    : {
        solid: "var(--warning)",
        alphaBg: "var(--warning-alpha-12)",
        alphaBorder: "var(--warning-alpha-30)",
      };

  return (
    <div className="flex gap-sm">
      {/* Acento vertical redondeado — color según variant (ámbar o azul) */}
      <div
        className="w-[3px] rounded-full self-stretch flex-shrink-0"
        style={{
          background: combineMode ? "var(--separator)" : accent.solid,
          opacity: combineMode ? 1 : 0.7,
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col gap-sm">
        {/* Chip pill */}
        <div
          className="self-start inline-flex items-center gap-sm pl-md pr-xs py-xxs rounded-pill"
          style={{
            background: accent.alphaBg,
            border: `1px solid ${accent.alphaBorder}`,
          }}
        >
          <span className="flex items-center gap-xs">
            {isVariants ? (
              <Shuffle size={14} style={{ color: accent.solid }} />
            ) : (
              <Link2 size={14} style={{ color: accent.solid }} />
            )}
            <span
              className="text-xs font-semibold tracking-wide whitespace-nowrap"
              style={{ color: accent.solid }}
            >
              {isVariants
                ? "Variantes"
                : `Superset · ${memberCount} ${memberCount === 1 ? "ejercicio" : "ejercicios"}`}
            </span>
          </span>

          {/* Separar — solo visible en modo superset, fuera del modo combinar, no readOnly, con handler */}
          {!isVariants && !combineMode && !readOnly && onUngroup && (
            <>
              <span
                className="w-px h-4 flex-shrink-0"
                style={{ background: accent.alphaBorder }}
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

        {/* Cards de los ejercicios/variantes del grupo */}
        <div className="flex flex-col gap-sm">{children}</div>
      </div>
    </div>
  );
};
