"use client";

import React, { useState } from "react";
import {
  ChevronUp,
  Settings2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SetsTable, EditableSet, routineSetToEditable, editableToRoutineSet } from "./SetsTable";
import { VariablesConfigModal } from "./VariablesConfigModal";
import { resolveVariablesConfig } from "@/lib/exercise-presets";
import type { RoutineExercise, VariablesConfig, ExerciseType } from "@/lib/api/types";

/** Bloque de ejercicio editable en el RoutineEditor */
export interface ExerciseBlockData {
  /** ID interno (RoutineExercise.id si es existente, o generado para nuevos) */
  _key: string;
  exercise_id: number | null;
  name: string;
  exercise_type: ExerciseType;
  is_warmup: boolean;
  variables_config: VariablesConfig;
  sets: EditableSet[];
  notes?: string;
  order_index: number;
}

interface ExerciseBlockProps {
  data: ExerciseBlockData;
  index: number;
  totalCount: number;
  readOnly?: boolean;
  onUpdate: (key: string, updated: Partial<ExerciseBlockData>) => void;
  onRemove: (key: string) => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  weight: "Peso",
  timed: "Tiempo",
  superset: "Superset",
  custom: "Custom",
  normal: "Peso",
  warmup: "Calentamiento",
  warmup_timed: "Calentamiento",
};

const TYPE_BADGE_VARIANT: Record<string, "neutral" | "primary" | "purple" | "warning"> = {
  weight: "neutral",
  timed: "primary",
  superset: "purple",
  custom: "warning",
  normal: "neutral",
  warmup: "warning",
  warmup_timed: "warning",
};

/**
 * ExerciseBlock — card de un ejercicio en el RoutineEditor.
 * Expansible: colapsado muestra resumen, expandido muestra SetsTable.
 */
export const ExerciseBlock: React.FC<ExerciseBlockProps> = ({
  data,
  index,
  totalCount,
  readOnly = false,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const [expanded, setExpanded] = useState(index === 0);
  const [showVarsModal, setShowVarsModal] = useState(false);

  const config = resolveVariablesConfig(data.variables_config, data.exercise_type);
  const isSuperset = data.exercise_type === "superset";

  // ─── Resumen colapsado ────────────────────────────────────────────────────

  const setCount = data.sets.length;
  const summaryParts: string[] = [`${setCount} ${setCount === 1 ? "serie" : "series"}`];

  // Intentar extraer reps promedio del primer set
  if (config.variables.find((v) => v.key === "reps")) {
    const repsVals = data.sets
      .map((s) => Number(s.reps))
      .filter((n) => !isNaN(n) && n > 0);
    if (repsVals.length > 0) {
      const minReps = Math.min(...repsVals);
      const maxReps = Math.max(...repsVals);
      summaryParts.push(minReps === maxReps ? `${minReps} reps` : `${minReps}-${maxReps} reps`);
    }
  }
  const restTimes = data.sets.map((s) => Number(s.rest_time)).filter((n) => !isNaN(n) && n > 0);
  if (restTimes.length > 0) {
    summaryParts.push(`${Math.round(restTimes[0])}s descanso`);
  }

  // ─── Handlers de series ───────────────────────────────────────────────────

  const handleSetChange = (idx: number, key: string, value: string) => {
    const newSets = [...data.sets];
    if (key.startsWith("_custom_")) {
      const customKey = key.replace("_custom_", "");
      newSets[idx] = {
        ...newSets[idx],
        _customVars: { ...(newSets[idx]._customVars ?? {}), [customKey]: value },
      };
    } else {
      // Usamos cast para manejar las keys dinámicas ya que EditableSet es un interface
      const updated = { ...newSets[idx] } as Record<string, unknown>;
      updated[key] = value;
      newSets[idx] = updated as EditableSet;
    }
    onUpdate(data._key, { sets: newSets });
  };

  const handleAddSet = () => {
    // Clonar última serie como template
    const last = data.sets[data.sets.length - 1];
    const newSet: EditableSet = last ? { ...last } : {};
    onUpdate(data._key, { sets: [...data.sets, newSet] });
  };

  const handleRemoveSet = (idx: number) => {
    if (data.sets.length <= 1) return;
    const newSets = data.sets.filter((_, i) => i !== idx);
    onUpdate(data._key, { sets: newSets });
  };

  const handleSaveVarsConfig = (newConfig: VariablesConfig) => {
    // Al cambiar variables config, migrar sets al nuevo schema
    const newSets = data.sets.map((set) => {
      const routineSet = editableToRoutineSet(set, config);
      return routineSetToEditable(routineSet, newConfig);
    });
    onUpdate(data._key, { variables_config: newConfig, sets: newSets });
  };

  // ─── Render colapsado ─────────────────────────────────────────────────────

  if (!expanded) {
    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-md px-xl py-md text-left hover:bg-fill-quaternary transition-colors"
        >
          {/* Número */}
          <div
            className={[
              "w-8 h-8 rounded-pill flex items-center justify-center flex-shrink-0 text-xs font-bold",
            ].join(" ")}
            style={
              isSuperset
                ? { background: "var(--purple-alpha-16)", color: "var(--purple)" }
                : { background: "var(--primary-alpha-12)", color: "var(--primary)" }
            }
          >
            {index + 1}
          </div>

          {/* Nombre + info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-sm flex-wrap">
              <span className="text-base font-semibold text-fg truncate">{data.name}</span>
              <Badge
                variant={TYPE_BADGE_VARIANT[data.exercise_type] ?? "neutral"}
                size="sm"
              >
                {TYPE_LABEL[data.exercise_type] ?? data.exercise_type}
              </Badge>
              {data.is_warmup && (
                <Badge variant="warning" size="sm">
                  Calentamiento
                </Badge>
              )}
            </div>
            <p className="text-xs text-fg-tertiary m-0 mt-xxs">{summaryParts.join(" · ")}</p>
          </div>

          <ChevronRight size={16} className="text-fg-tertiary flex-shrink-0" />
        </button>
      </div>
    );
  }

  // ─── Render expandido ─────────────────────────────────────────────────────

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header expandido */}
      <div className="flex items-center justify-between gap-md px-xl py-lg">
        <div className="flex items-center gap-md flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-pill flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={
              isSuperset
                ? { background: "var(--purple-alpha-16)", color: "var(--purple)" }
                : { background: "var(--primary-alpha-12)", color: "var(--primary)" }
            }
          >
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-sm flex-wrap">
              <span className="text-base font-semibold text-fg">{data.name}</span>
              <Badge
                variant={TYPE_BADGE_VARIANT[data.exercise_type] ?? "neutral"}
                size="sm"
              >
                {TYPE_LABEL[data.exercise_type] ?? data.exercise_type}
              </Badge>
              {data.is_warmup && (
                <Badge variant="warning" size="sm">
                  Calentamiento
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Acciones del header */}
        <div className="flex items-center gap-xs flex-shrink-0">
          {!readOnly && (
            <>
              {/* Variables config */}
              <button
                type="button"
                onClick={() => setShowVarsModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors"
                style={{ background: "var(--fill-tertiary)" }}
                title="Personalizar variables"
              >
                <Settings2 size={15} />
              </button>

              {/* Mover arriba */}
              <button
                type="button"
                onClick={() => onMoveUp(data._key)}
                disabled={index === 0}
                className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "var(--fill-tertiary)" }}
                title="Mover arriba"
              >
                <ArrowUp size={15} />
              </button>

              {/* Mover abajo */}
              <button
                type="button"
                onClick={() => onMoveDown(data._key)}
                disabled={index === totalCount - 1}
                className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "var(--fill-tertiary)" }}
                title="Mover abajo"
              >
                <ArrowDown size={15} />
              </button>

              {/* Eliminar ejercicio */}
              <button
                type="button"
                onClick={() => onRemove(data._key)}
                className="w-8 h-8 flex items-center justify-center rounded-pill transition-colors"
                style={{
                  background: "var(--destructive-alpha-12)",
                  color: "var(--destructive)",
                }}
                title="Eliminar ejercicio"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}

          {/* Colapsar */}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors"
            style={{ background: "var(--fill-tertiary)" }}
            title="Colapsar"
          >
            <ChevronUp size={15} />
          </button>
        </div>
      </div>

      {/* Tabla de series */}
      <div className="px-xl pb-lg">
        <SetsTable
          sets={data.sets}
          config={config}
          exerciseType={data.exercise_type}
          isWarmup={data.is_warmup}
          readOnly={readOnly}
          onSetChange={handleSetChange}
          onAddSet={handleAddSet}
          onRemoveSet={handleRemoveSet}
        />
      </div>

      {/* Modal de configuración de variables */}
      <VariablesConfigModal
        open={showVarsModal}
        onClose={() => setShowVarsModal(false)}
        currentConfig={config}
        onSave={handleSaveVarsConfig}
      />
    </div>
  );
};

// ─── Helpers de conversión ────────────────────────────────────────────────────

/**
 * Convierte RoutineExercise del backend a ExerciseBlockData (estado interno del editor).
 */
export function routineExerciseToBlock(re: RoutineExercise): ExerciseBlockData {
  const resolvedType: ExerciseType =
    (re.exercise_type === "normal" || re.exercise_type === "warmup"
      ? "weight"
      : re.exercise_type === "warmup_timed"
      ? "timed"
      : re.exercise_type) as ExerciseType ?? "weight";

  const config = resolveVariablesConfig(re.variables_config, resolvedType);

  // Convertir sets_data a EditableSet[]
  let sets: EditableSet[];
  if (re.sets_data && re.sets_data.length > 0) {
    sets = re.sets_data.map((s) => routineSetToEditable(s, config));
  } else {
    // Crear sets a partir de re.series
    const defaultSetRaw: Record<string, string> = {};
    for (const varDef of config.variables) {
      if (!varDef.is_custom) {
        defaultSetRaw[varDef.key] = String(varDef.default_value ?? 0);
      }
    }
    if (resolvedType === "superset") {
      defaultSetRaw.alias = "A";
    }
    const defaultSet: EditableSet = defaultSetRaw as EditableSet;
    sets = Array.from({ length: re.series || 1 }, () => ({ ...defaultSet }));
  }

  return {
    _key: `ex-${re.id}-${Date.now()}`,
    exercise_id: re.exercise_id ?? null,
    name: re.name,
    exercise_type: resolvedType,
    is_warmup: re.is_warmup ?? false,
    variables_config: config,
    sets,
    notes: re.notes ?? undefined,
    order_index: re.order_index,
  };
}
