"use client";

import React, { useState } from "react";
import { Plus, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { VariablesConfig, RoutineExerciseSet } from "@/lib/api/types";
import { getVariableDisplayLabel } from "@/lib/exercise-presets";
import { RestTimerModal } from "./RestTimerModal";
import { formatTimerTime } from "@/lib/timer";

// Tipo interno de edición: las celdas son strings para poder tipear valores parciales.
// Las variables canónicas se almacenan como props planas (string),
// las variables custom bajo _customVars.
export interface EditableSet {
  // Variables canónicas (reps, weight_kg, rir, seconds, distance_m, calories, bricks, rpe)
  reps?: string;
  weight_kg?: string;
  rir?: string;
  seconds?: string;
  distance_m?: string;
  calories?: string;
  bricks?: string;
  rpe?: string;
  // Metadatos de serie
  alias?: string;
  rest_time?: string;
  // Variables custom del ejercicio
  _customVars?: Record<string, string>;
}

interface SetsTableProps {
  sets: EditableSet[];
  config: VariablesConfig;
  exerciseType: string;
  isWarmup?: boolean;
  readOnly?: boolean;
  onSetChange: (index: number, key: string, value: string) => void;
  onAddSet: () => void;
  onRemoveSet: (index: number) => void;
  /** Si true, oculta el botón "Añadir serie" (cuando el padre lo renderiza). */
  hideAddButton?: boolean;
}

/**
 * SetsTable — tabla de series editable, data-driven por variables_config.
 *
 * Las columnas se derivan dinámicamente de `config.variables`.
 * Para superset: agrega columna 'alias'.
 * Si N > 4 columnas → scroll horizontal.
 */
export const SetsTable: React.FC<SetsTableProps> = ({
  sets,
  config,
  exerciseType,
  isWarmup = false,
  readOnly = false,
  onSetChange,
  onAddSet,
  onRemoveSet,
  hideAddButton = false,
}) => {
  const isSuperset = exerciseType === "superset";
  const variables = config?.variables ?? [];

  // Índice de la serie cuyo modal de descanso está abierto (null = cerrado).
  const [timerSetIndex, setTimerSetIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-sm">
      {sets.map((set, idx) => {
        const rt = set.rest_time && set.rest_time !== "" ? Number(set.rest_time) : 0;
        const restLabel = rt > 0 ? formatTimerTime(rt) : "Descanso";
        return (
          <div
            key={idx}
            className="rounded-lg p-md flex flex-col gap-sm"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--separator-subtle)",
            }}
          >
            {/* Fila superior: número + inputs */}
            <div className="flex items-center gap-md">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-pill text-xs font-bold flex-shrink-0"
                style={
                  isWarmup
                    ? { background: "var(--warning-alpha-20)", color: "var(--warning)" }
                    : {
                        background: "var(--primary-alpha-16)",
                        color: "var(--primary)",
                        border: "1px solid var(--primary-alpha-30)",
                      }
                }
              >
                {isWarmup ? "W" : idx + 1}
              </span>

              <div className="flex-1 flex flex-wrap gap-md">
                {isSuperset && (
                  <div className="flex flex-col gap-xxs" style={{ width: "64px" }}>
                    <label className="text-xxs font-semibold text-fg-tertiary uppercase tracking-wide">
                      Alias
                    </label>
                    {readOnly ? (
                      <div
                        className="h-9 flex items-center justify-center rounded-sm text-lg font-semibold text-fg"
                        style={{ background: "var(--fill-tertiary)" }}
                      >
                        {set.alias || "—"}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={set.alias ?? ""}
                        onChange={(e) =>
                          onSetChange(idx, "alias", e.target.value.toUpperCase().slice(0, 2))
                        }
                        maxLength={2}
                        className="h-9 text-fg border border-transparent rounded-sm text-lg font-medium text-center outline-none focus:border-primary"
                        style={{ background: "var(--fill-tertiary)" }}
                        placeholder="A"
                      />
                    )}
                  </div>
                )}

                {variables.map((varDef) => {
                  const rawValue = varDef.is_custom
                    ? (set._customVars ?? {})[varDef.key] ?? ""
                    : (set as Record<string, string | undefined>)[varDef.key] ?? "";

                  return (
                    <div
                      key={varDef.key}
                      className="flex flex-col gap-xxs flex-1"
                      style={{ minWidth: "96px" }}
                    >
                      <label className="text-xxs font-semibold text-fg-tertiary uppercase tracking-wide truncate">
                        {getVariableDisplayLabel(varDef)}
                      </label>
                      {readOnly ? (
                        <div
                          className="h-9 flex items-center justify-center rounded-sm text-lg font-medium text-fg"
                          style={{ background: "var(--fill-tertiary)" }}
                        >
                          {rawValue || "—"}
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={rawValue}
                          min={0}
                          step={varDef.type === "int" ? 1 : 0.5}
                          onChange={(e) =>
                            onSetChange(
                              idx,
                              varDef.is_custom ? `_custom_${varDef.key}` : varDef.key,
                              e.target.value
                            )
                          }
                          className="h-9 w-full text-fg border border-transparent rounded-sm text-lg font-medium text-center outline-none focus:border-primary px-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                          style={{ background: "var(--fill-tertiary)" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fila inferior: eliminar serie + descanso (alineada con los inputs) */}
            {!readOnly && (
              <div className="flex items-center gap-sm pl-[40px]">
                <button
                  type="button"
                  onClick={() => onRemoveSet(idx)}
                  disabled={sets.length <= 1}
                  className="w-10 h-9 flex items-center justify-center rounded-sm flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--destructive-alpha-12)",
                    color: "var(--destructive)",
                    border: "1px solid var(--destructive)",
                  }}
                  aria-label={`Eliminar serie ${idx + 1}`}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setTimerSetIndex(idx)}
                  className="flex-1 h-9 inline-flex items-center justify-center gap-xs rounded-sm text-sm text-fg-secondary border border-transparent outline-none hover:border-primary transition-colors cursor-pointer tabular-nums"
                  style={{ background: "var(--fill-tertiary)" }}
                  title="Configurar descanso"
                >
                  <Clock size={13} className="text-fg-tertiary" />
                  {restLabel}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Añadir serie (full-width) — se puede ocultar si el padre lo renderiza */}
      {!readOnly && !hideAddButton && (
        <Button
          type="button"
          variant="primarySoft"
          size="md"
          className="w-full"
          iconLeft={<Plus size={16} />}
          onClick={onAddSet}
        >
          Añadir serie
        </Button>
      )}

      {/* Modal de descanso por serie */}
      {timerSetIndex !== null && (
        <RestTimerModal
          open={timerSetIndex !== null}
          initialSeconds={
            sets[timerSetIndex]?.rest_time && sets[timerSetIndex].rest_time !== ""
              ? Number(sets[timerSetIndex].rest_time)
              : null
          }
          onClose={() => setTimerSetIndex(null)}
          onSave={(seconds) =>
            onSetChange(timerSetIndex, "rest_time", seconds > 0 ? String(seconds) : "")
          }
        />
      )}
    </div>
  );
};

// ─── Helpers para convertir sets_data ↔ EditableSet ──────────────────────────

/**
 * Convierte un RoutineExerciseSet del backend al formato editable interno.
 */
export function routineSetToEditable(
  set: RoutineExerciseSet,
  config: VariablesConfig
): EditableSet {
  const editable: EditableSet = {};

  for (const varDef of config.variables) {
    if (varDef.is_custom) {
      // Las variables custom viven en set.custom
      const customVal = set.custom?.[varDef.key];
      if (!editable._customVars) editable._customVars = {};
      editable._customVars[varDef.key] = customVal != null ? String(customVal) : "";
    } else {
      const val = (set as Record<string, unknown>)[varDef.key];
      const strVal = val != null ? String(val) : "";
      (editable as Record<string, string | undefined>)[varDef.key] = strVal;
    }
  }

  editable.alias = set.alias ?? undefined;
  editable.rest_time = set.rest_time != null ? String(set.rest_time) : "";

  return editable;
}

/**
 * Convierte EditableSet al RoutineExerciseSet para el backend.
 */
export function editableToRoutineSet(
  editable: EditableSet,
  config: VariablesConfig
): RoutineExerciseSet {
  const result: RoutineExerciseSet = {};

  for (const varDef of config.variables) {
    if (varDef.is_custom) {
      if (!result.custom) result.custom = {};
      const rawVal = (editable._customVars ?? {})[varDef.key];
      const parsed = rawVal !== "" && rawVal != null ? Number(rawVal) : 0;
      result.custom[varDef.key] = isNaN(parsed) ? 0 : parsed;
    } else {
      const rawVal = (editable as Record<string, string | undefined>)[varDef.key];
      const parsed =
        rawVal !== "" && rawVal != null ? Number(rawVal) : undefined;
      if (parsed !== undefined && !isNaN(parsed)) {
        (result as Record<string, unknown>)[varDef.key] = parsed;
      }
    }
  }

  if (editable.alias) {
    result.alias = editable.alias;
  }

  if (editable.rest_time && editable.rest_time !== "") {
    const rt = Number(editable.rest_time);
    result.rest_time = isNaN(rt) ? null : rt;
  }

  return result;
}
