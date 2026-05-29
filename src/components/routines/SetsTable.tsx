"use client";

import React from "react";
import { X, Plus } from "lucide-react";
import type { VariablesConfig, RoutineExerciseSet } from "@/lib/api/types";
import { getVariableDisplayLabel } from "@/lib/exercise-presets";

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
}) => {
  const isSuperset = exerciseType === "superset";
  const variables = config?.variables ?? [];

  // Las columnas son: [alias (superset)], [rest_time], [variables del config], [eliminar]
  const hasRestTime = true;

  // Calcula si hace falta scroll horizontal
  const totalCols =
    (isSuperset ? 1 : 0) +
    variables.length +
    (hasRestTime ? 1 : 0) +
    1 /* nro serie */ +
    1; /* eliminar */

  const needsScroll = totalCols > 6;

  return (
    <div className="flex flex-col gap-sm">
      <div
        style={
          needsScroll
            ? { overflowX: "auto", WebkitOverflowScrolling: "touch" }
            : undefined
        }
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: needsScroll ? "600px" : undefined,
          }}
        >
          <thead>
            <tr>
              <th
                className="text-xs font-semibold text-fg-tertiary text-left py-xs pr-md"
                style={{ width: "48px" }}
              >
                #
              </th>
              {isSuperset && (
                <th className="text-xs font-semibold text-fg-tertiary text-left py-xs pr-md">
                  Alias
                </th>
              )}
              {variables.map((varDef) => (
                <th
                  key={varDef.key}
                  className="text-xs font-semibold text-fg-tertiary text-left py-xs pr-md"
                >
                  {getVariableDisplayLabel(varDef)}
                </th>
              ))}
              <th className="text-xs font-semibold text-fg-tertiary text-left py-xs pr-md">
                Descanso (s)
              </th>
              {!readOnly && <th style={{ width: "36px" }} />}
            </tr>
          </thead>
          <tbody>
            {sets.map((set, idx) => (
              <tr key={idx}>
                {/* Número de serie con indicador warmup */}
                <td className="py-xs pr-md">
                  <span
                    className={[
                      "inline-flex items-center justify-center w-7 h-7 rounded-pill text-xs font-bold",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      isWarmup
                        ? {
                            background: "var(--warning-alpha-16)",
                            color: "var(--warning)",
                          }
                        : {
                            background: "var(--primary-alpha-12)",
                            color: "var(--primary)",
                          }
                    }
                  >
                    {isWarmup ? "W" : idx + 1}
                  </span>
                </td>

                {/* Alias (superset) */}
                {isSuperset && (
                  <td className="py-xs pr-sm" style={{ minWidth: "64px" }}>
                    {readOnly ? (
                      <span className="text-sm text-fg font-semibold px-sm py-xxs rounded-md" style={{ background: "var(--fill-tertiary)" }}>
                        {set.alias || "—"}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={set.alias ?? ""}
                        onChange={(e) =>
                          onSetChange(idx, "alias", e.target.value.toUpperCase().slice(0, 2))
                        }
                        maxLength={2}
                        className="w-12 h-9 bg-fill-tertiary text-fg border border-transparent rounded-md text-sm text-center outline-none focus:border-primary focus:bg-fill-quaternary"
                        placeholder="A"
                      />
                    )}
                  </td>
                )}

                {/* Variables dinámicas */}
                {variables.map((varDef) => {
                  const rawValue = varDef.is_custom
                    ? (set._customVars ?? {})[varDef.key] ?? ""
                    : (set as Record<string, string | undefined>)[varDef.key] ?? "";

                  return (
                    <td key={varDef.key} className="py-xs pr-sm" style={{ minWidth: "72px" }}>
                      {readOnly ? (
                        <span className="text-sm text-fg">
                          {rawValue || "—"}
                        </span>
                      ) : (
                        <input
                          type="number"
                          value={rawValue}
                          min={0}
                          step={varDef.type === "int" ? 1 : 0.5}
                          onChange={(e) =>
                            onSetChange(
                              idx,
                              varDef.is_custom
                                ? `_custom_${varDef.key}`
                                : varDef.key,
                              e.target.value
                            )
                          }
                          className="w-full h-9 bg-fill-tertiary text-fg border border-transparent rounded-md text-sm text-center outline-none focus:border-primary focus:bg-fill-quaternary px-xs"
                        />
                      )}
                    </td>
                  );
                })}

                {/* Descanso */}
                <td className="py-xs pr-sm" style={{ minWidth: "80px" }}>
                  {readOnly ? (
                    <span className="text-sm text-fg">
                      {set.rest_time ? `${set.rest_time}s` : "—"}
                    </span>
                  ) : (
                    <input
                      type="number"
                      value={set.rest_time ?? ""}
                      min={0}
                      step={10}
                      onChange={(e) => onSetChange(idx, "rest_time", e.target.value)}
                      className="w-full h-9 bg-fill-tertiary text-fg border border-transparent rounded-md text-sm text-center outline-none focus:border-primary focus:bg-fill-quaternary px-xs"
                      placeholder="60"
                    />
                  )}
                </td>

                {/* Eliminar serie */}
                {!readOnly && (
                  <td className="py-xs">
                    <button
                      type="button"
                      onClick={() => onRemoveSet(idx)}
                      disabled={sets.length <= 1}
                      className="w-7 h-7 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={`Eliminar serie ${idx + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Agregar serie */}
      {!readOnly && (
        <button
          type="button"
          onClick={onAddSet}
          className="flex items-center gap-xs text-sm text-fg-secondary hover:text-fg transition-colors py-xs px-md rounded-pill"
          style={{
            background: "var(--fill-tertiary)",
            border: "1px dashed var(--separator)",
          }}
        >
          <Plus size={14} />
          Agregar serie
        </button>
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
