"use client";

/**
 * FinishedWorkoutDetail — Vista de detalle de un entrenamiento finalizado.
 *
 * Muestra ejercicios, series (peso/reps/RIR/etc.), duración, comentarios y
 * estado de ánimo de un log completado del alumno.
 *
 * Maneja:
 * - Ejercicios normales (weight, timed, custom)
 * - Supersets nuevos: filas independientes con superset_group UUID (agrupadas en rondas via buildRounds)
 * - Supersets legacy: exercise_type='superset' con alias en sets_data (riesgo #9)
 *   Aplica migrateLegacySupersetSets para normalizar antes de renderizar.
 *
 * Props:
 *   studentId  — id del alumno (para la API)
 *   logId      — id del log a mostrar
 *   log?       — si ya está cargado, se usa directamente (sin fetch)
 *   onClose?   — callback para cerrar/volver
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Smile,
  Zap,
  MessageSquare,
  Layers,
} from "lucide-react";
import { getStudentLogDetail } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { groupBySupersetGroup, buildRounds } from "@/lib/superset-grouping";
import {
  migrateLegacySupersetSets,
  groupLegacySetsByAlias,
  type LegacySupersetSetRaw,
} from "@/lib/superset";
import {
  formatPerformedDateLong,
  formatPerformedTime,
  APP_TIME_ZONE,
} from "@/lib/datetime";
import type { FriendWorkoutLogData, VariablesConfig } from "@/lib/api/types";

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ExerciseSnapshot {
  id: number;
  name: string;
  exercise_id?: number | null;
  order_index: number;
  variant_order?: number;
  exercise_type?: string | null;
  is_warmup?: boolean;
  superset_group?: string | null;
  sets_data?: Array<Record<string, unknown>> | null;
  variables_config?: VariablesConfig | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FinishedWorkoutDetailProps {
  studentId: number;
  logId: number;
  /** Log pre-cargado. Si se pasa, no se hace fetch. */
  log?: FriendWorkoutLogData;
  onClose?: () => void;
}

// ─── Helpers de formato ───────────────────────────────────────────────────────

function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function formatMood(mood: string | null | undefined): string | null {
  if (!mood) return null;
  const map: Record<string, string> = {
    great: "Muy bien",
    good: "Bien",
    okay: "Regular",
    bad: "Mal",
    terrible: "Muy mal",
  };
  return map[mood] ?? mood;
}

function formatEnergy(energy: string | null | undefined): string | null {
  if (!energy) return null;
  const map: Record<string, string> = {
    high: "Alta energía",
    medium: "Energía media",
    low: "Poca energía",
  };
  return map[energy] ?? energy;
}

function formatPerformedAt(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const datePart = new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: APP_TIME_ZONE,
    }).format(date);
    const timePart = new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: APP_TIME_ZONE,
    }).format(date);
    const cap = datePart.charAt(0).toUpperCase() + datePart.slice(1);
    return `${cap} · ${timePart}`;
  } catch {
    return dateStr;
  }
}

// ─── Renderizado de sets individuales ────────────────────────────────────────

interface SetCellProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

const SetCell: React.FC<SetCellProps> = ({ label, value, unit }) => {
  if (value == null || value === "" || value === 0) return null;
  return (
    <div className="flex flex-col items-center gap-xxs min-w-[40px]">
      <span className="text-xxs text-fg-tertiary uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-fg">
        {value}
        {unit && <span className="text-xs text-fg-tertiary ml-xxs">{unit}</span>}
      </span>
    </div>
  );
};

// ─── Renderizado de una sola fila de serie ────────────────────────────────────

interface SetRowDisplayProps {
  setIndex: number;
  set: Record<string, unknown>;
  variablesConfig?: VariablesConfig | null;
  exerciseType?: string | null;
}

const SetRowDisplay: React.FC<SetRowDisplayProps> = ({
  setIndex,
  set,
  variablesConfig,
  exerciseType,
}) => {
  const isLegacySuperset = exerciseType === "superset";

  // Para supersets legacy, el set tiene alias en vez de variables canónicas
  if (isLegacySuperset) return null;

  // Derivar columnas desde variables_config si existe
  const cells: Array<{ key: string; label: string; unit?: string }> = [];

  if (variablesConfig?.variables && variablesConfig.variables.length > 0) {
    for (const v of variablesConfig.variables) {
      if (!v.is_custom) {
        cells.push({ key: v.key, label: v.label ?? v.key, unit: v.unit });
      }
    }
  } else {
    // Fallback por tipo de ejercicio
    const type = exerciseType ?? "weight";
    if (type === "timed") {
      cells.push({ key: "seconds", label: "Seg", unit: "s" });
    } else {
      cells.push({ key: "reps", label: "Reps" });
      cells.push({ key: "weight_kg", label: "Kg", unit: "kg" });
      cells.push({ key: "rir", label: "RIR" });
    }
  }

  const hasAnyValue = cells.some((c) => {
    const v = set[c.key];
    return v != null && v !== "" && v !== 0;
  });

  // Si la serie está marcada como no completada y no tiene valores, omitir
  if (!hasAnyValue) return null;

  return (
    <div
      className="flex items-center gap-md px-lg py-sm rounded-md"
      style={{ background: "var(--fill-quaternary)" }}
    >
      <span className="text-xs text-fg-tertiary w-8 flex-shrink-0">
        S{setIndex + 1}
      </span>
      <div className="flex items-center gap-lg flex-wrap">
        {cells.map((c) => (
          <SetCell
            key={c.key}
            label={c.label}
            value={set[c.key] as string | number | null | undefined}
            unit={c.unit}
          />
        ))}
        {set.rest_time != null && Number(set.rest_time) > 0 && (
          <SetCell
            label="Descanso"
            value={`${set.rest_time}s`}
          />
        )}
      </div>
    </div>
  );
};

// ─── Ejercicio normal (no superset) ──────────────────────────────────────────

interface ExerciseCardProps {
  exercise: ExerciseSnapshot;
  defaultExpanded?: boolean;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isLegacySuperset = exercise.exercise_type === "superset";
  const sets = (exercise.sets_data ?? []) as Array<Record<string, unknown>>;
  const isWarmup = exercise.is_warmup === true;

  // ─ Rama legacy superset ──────────────────────────────────────────────────
  if (isLegacySuperset) {
    const legacySets = migrateLegacySupersetSets(
      sets as LegacySupersetSetRaw[],
    );
    const byAlias = groupLegacySetsByAlias(legacySets);
    const aliases = [...byAlias.keys()];
    const maxRounds = Math.max(...[...byAlias.values()].map((s) => s.length), 0);

    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{
          border: "1px solid var(--purple-alpha-16)",
          background: "var(--card)",
        }}
      >
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center gap-md px-lg py-md text-left"
          style={{ background: "var(--purple-alpha-12)" }}
        >
          <div
            className="w-7 h-7 rounded-pill flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--purple-alpha-16)" }}
          >
            <Layers size={14} style={{ color: "var(--purple)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-xs">
              <span className="text-sm font-semibold text-fg truncate">
                {exercise.name}
              </span>
              {isWarmup && (
                <span
                  className="text-xxs px-xs py-xxs rounded-xs font-medium"
                  style={{
                    background: "var(--warning-alpha-20)",
                    color: "var(--warning)",
                  }}
                >
                  Calentamiento
                </span>
              )}
              <span
                className="text-xxs px-xs py-xxs rounded-xs font-medium"
                style={{
                  background: "var(--purple-alpha-12)",
                  color: "var(--purple)",
                }}
              >
                Superset
              </span>
            </div>
            <span className="text-xs text-fg-tertiary">
              {aliases.length} ejercicios · {maxRounds} rondas
            </span>
          </div>
          {expanded ? (
            <ChevronUp size={14} className="text-fg-tertiary flex-shrink-0" />
          ) : (
            <ChevronDown size={14} className="text-fg-tertiary flex-shrink-0" />
          )}
        </button>

        {expanded && (
          <div className="px-lg pb-lg pt-md flex flex-col gap-md">
            {aliases.map((alias) => {
              const aliasSets = byAlias.get(alias)!;
              const firstName = aliasSets[0]?.exercise_name ?? `Ejercicio ${alias}`;
              return (
                <div key={alias} className="flex flex-col gap-xs">
                  <span className="text-xs font-semibold text-fg-secondary uppercase tracking-wide">
                    {alias} — {firstName}
                  </span>
                  {aliasSets.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-md px-lg py-sm rounded-md"
                      style={{ background: "var(--fill-quaternary)" }}
                    >
                      <span className="text-xs text-fg-tertiary w-8 flex-shrink-0">
                        R{idx + 1}
                      </span>
                      <div className="flex items-center gap-lg flex-wrap">
                        {s.reps != null && s.reps !== 0 && (
                          <SetCell label="Reps" value={s.reps} />
                        )}
                        {s.weight_kg != null && s.weight_kg !== 0 && (
                          <SetCell label="Kg" value={s.weight_kg} unit="kg" />
                        )}
                        {s.rir != null && (
                          <SetCell label="RIR" value={s.rir} />
                        )}
                        {s.seconds != null && s.seconds !== 0 && (
                          <SetCell label="Seg" value={s.seconds} unit="s" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─ Ejercicio normal ───────────────────────────────────────────────────────
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--card-border)",
        background: "var(--card)",
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-md px-lg py-md text-left hover:bg-fill-quaternary transition-colors"
      >
        <div
          className="w-7 h-7 rounded-pill flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--primary-alpha-12)", color: "var(--primary)" }}
        >
          <Dumbbell size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-xs flex-wrap">
            <span className="text-sm font-semibold text-fg truncate">
              {exercise.name}
            </span>
            {isWarmup && (
              <span
                className="text-xxs px-xs py-xxs rounded-xs font-medium"
                style={{
                  background: "var(--warning-alpha-20)",
                  color: "var(--warning)",
                }}
              >
                Calentamiento
              </span>
            )}
          </div>
          {sets.length > 0 && (
            <span className="text-xs text-fg-tertiary">
              {sets.length} serie(s)
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-fg-tertiary flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-fg-tertiary flex-shrink-0" />
        )}
      </button>

      {expanded && sets.length > 0 && (
        <div className="px-lg pb-lg pt-xs flex flex-col gap-xs">
          {sets.map((s, idx) => (
            <SetRowDisplay
              key={idx}
              setIndex={idx}
              set={s}
              variablesConfig={exercise.variables_config}
              exerciseType={exercise.exercise_type}
            />
          ))}
        </div>
      )}

      {expanded && sets.length === 0 && (
        <p className="px-lg pb-md text-xs text-fg-tertiary">
          Sin series registradas
        </p>
      )}
    </div>
  );
};

// ─── Bloque de superset nuevo (filas independientes con superset_group) ───────

interface SupersetBlockProps {
  groupId: string;
  exercises: ExerciseSnapshot[];
  label: string;
}

const SupersetBlock: React.FC<SupersetBlockProps> = ({
  groupId,
  exercises,
  label,
}) => {
  const [expanded, setExpanded] = useState(true);

  // Construir las rondas intercaladas
  const exercisesForRounds = exercises.map((ex) => ({
    id: ex.id,
    sets_data: (ex.sets_data ?? []) as Record<string, unknown>[],
  }));
  const rounds = buildRounds(exercisesForRounds);

  const totalRounds = rounds.length;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--purple-alpha-16)",
        background: "var(--card)",
      }}
    >
      {/* Header del grupo */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-md px-lg py-md text-left"
        style={{ background: "var(--purple-alpha-12)" }}
      >
        <div
          className="w-7 h-7 rounded-pill flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--purple-alpha-16)" }}
        >
          <Layers size={14} style={{ color: "var(--purple)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-fg">{label}</span>
          <span className="block text-xs text-fg-tertiary">
            {exercises.length} ejercicios · {totalRounds} rondas
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-fg-tertiary flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-fg-tertiary flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-lg pb-lg pt-md flex flex-col gap-lg">
          {/* Por cada ronda, mostrar los sets intercalados */}
          {rounds.map((round) => (
            <div key={round.round} className="flex flex-col gap-xs">
              <span className="text-xs font-semibold text-fg-tertiary uppercase tracking-wide">
                Ronda {round.round + 1}
              </span>
              {round.items.map((item) => {
                const ex = exercises.find((e) => e.id === item.exerciseId);
                if (!ex) return null;
                return (
                  <div key={`${item.exerciseId}-${item.setIndex}`} className="flex flex-col gap-xxs">
                    <span className="text-xs text-fg-secondary">{ex.name}</span>
                    <SetRowDisplay
                      setIndex={item.setIndex}
                      set={item.set}
                      variablesConfig={ex.variables_config}
                      exerciseType={ex.exercise_type}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {rounds.length === 0 && (
            <p className="text-xs text-fg-tertiary">Sin series registradas</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div className="flex flex-col gap-sm">
        <SkeletonLine width="55%" height={22} />
        <SkeletonLine width="35%" height={14} />
        <div className="flex gap-md mt-xs">
          <SkeletonLine width={80} height={28} />
          <SkeletonLine width={80} height={28} />
        </div>
      </div>
      {/* Ejercicios */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <div className="flex items-center gap-md px-lg py-md" style={{ background: "var(--card)" }}>
            <SkeletonBox width={28} height={28} />
            <div className="flex flex-col gap-xxs flex-1">
              <SkeletonLine width="50%" height={14} />
              <SkeletonLine width="30%" height={11} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * FinishedWorkoutDetail
 *
 * Recibe `studentId` + `logId` y hace fetch si no se pasa `log` directamente.
 * Maneja supersets nuevos (superset_group UUID) y legacy (exercise_type='superset').
 */
export const FinishedWorkoutDetail: React.FC<FinishedWorkoutDetailProps> = ({
  studentId,
  logId,
  log: logProp,
  onClose,
}) => {
  const [log, setLog] = useState<FriendWorkoutLogData | null>(logProp ?? null);
  const [loading, setLoading] = useState(logProp == null);
  const [error, setError] = useState<string | null>(null);

  const loadLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentLogDetail(studentId, logId);
      setLog(data);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el detalle del entrenamiento"));
    } finally {
      setLoading(false);
    }
  }, [studentId, logId]);

  useEffect(() => {
    if (logProp != null) {
      setLog(logProp);
      setLoading(false);
      return;
    }
    loadLog();
  }, [logId, logProp, loadLog]);

  // ─ Loading ──────────────────────────────────────────────────────────────
  if (loading) return <DetailSkeleton />;

  // ─ Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col gap-lg">
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<ArrowLeft size={14} />}
            onClick={onClose}
          >
            Volver
          </Button>
        )}
        <ErrorBanner message={error} dismissible />
        <Button variant="outline" size="sm" onClick={loadLog}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!log) return null;

  const snapshot = log.routine_snapshot;
  const routineTitle = snapshot?.routine?.title ?? log.routine?.title ?? "Entrenamiento";
  const exercises = (snapshot?.exercises ?? []) as ExerciseSnapshot[];
  const duration = formatDuration(log.duration_minutes);
  const mood = formatMood(log.mood);
  const energy = formatEnergy(log.energy_level);

  // ─ Agrupar ejercicios: superset_group nuevo vs standalone vs legacy ───────
  //
  // El snapshot puede mezclar:
  //   1. Ejercicios normales (superset_group == null, exercise_type != 'superset')
  //   2. Ejercicios en superset nuevo (superset_group == UUID, exercise_type != 'superset')
  //   3. Ejercicios legacy superset (exercise_type == 'superset', superset_group == null)
  //
  // Separamos primero legacy (para no confundirlos con standalone del nuevo modelo).
  const legacySupersets = exercises.filter((e) => e.exercise_type === "superset");
  const modernExercises = exercises.filter((e) => e.exercise_type !== "superset");

  const { groups, standalone, orderedGroupIds } = groupBySupersetGroup(
    modernExercises.map((e) => ({ ...e, superset_group: e.superset_group ?? null })),
  );

  // Construir lista ordenada de bloques (ejercicios sueltos y grupos en su order_index)
  type ExerciseBlock =
    | { kind: "standalone"; exercise: ExerciseSnapshot }
    | { kind: "superset"; groupId: string; exercises: ExerciseSnapshot[] }
    | { kind: "legacy"; exercise: ExerciseSnapshot };

  const blocks: Array<ExerciseBlock & { sortKey: number }> = [];

  for (const ex of standalone) {
    blocks.push({ kind: "standalone", exercise: ex, sortKey: ex.order_index });
  }

  for (const gid of orderedGroupIds) {
    const members = groups.get(gid) ?? [];
    const minOrder = Math.min(...members.map((m) => m.order_index));
    blocks.push({ kind: "superset", groupId: gid, exercises: members, sortKey: minOrder });
  }

  for (const ex of legacySupersets) {
    blocks.push({ kind: "legacy", exercise: ex, sortKey: ex.order_index });
  }

  blocks.sort((a, b) => a.sortKey - b.sortKey);

  return (
    <div className="flex flex-col gap-lg">
      {/* Botón volver */}
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft size={14} />}
          onClick={onClose}
          className="self-start"
        >
          Volver
        </Button>
      )}

      {/* Header del log */}
      <div className="flex flex-col gap-xs">
        <h2 className="text-xl font-semibold text-fg m-0">{routineTitle}</h2>
        <p className="text-sm text-fg-secondary m-0">
          {formatPerformedAt(log.performed_at)}
        </p>

        {/* Chips de metadatos */}
        <div className="flex flex-wrap gap-sm mt-xs">
          {duration && (
            <div
              className="flex items-center gap-xs px-md py-xs rounded-pill text-xs font-medium"
              style={{
                background: "var(--primary-alpha-12)",
                color: "var(--primary)",
              }}
            >
              <Clock size={12} />
              {duration}
            </div>
          )}
          {mood && (
            <div
              className="flex items-center gap-xs px-md py-xs rounded-pill text-xs font-medium"
              style={{
                background: "var(--success-alpha-12)",
                color: "var(--success)",
              }}
            >
              <Smile size={12} />
              {mood}
            </div>
          )}
          {energy && (
            <div
              className="flex items-center gap-xs px-md py-xs rounded-pill text-xs font-medium"
              style={{
                background: "var(--accent-alpha-12)",
                color: "var(--accent)",
              }}
            >
              <Zap size={12} />
              {energy}
            </div>
          )}
        </div>

        {/* Notas */}
        {log.notes && (
          <div
            className="flex gap-sm p-md rounded-md mt-xs"
            style={{
              background: "var(--fill-quaternary)",
              border: "1px solid var(--separator-subtle)",
            }}
          >
            <MessageSquare size={14} className="text-fg-tertiary flex-shrink-0 mt-xxs" />
            <p className="text-sm text-fg-secondary m-0">{log.notes}</p>
          </div>
        )}
      </div>

      {/* Separador */}
      <div style={{ borderTop: "1px solid var(--separator-subtle)" }} />

      {/* Ejercicios */}
      {blocks.length === 0 ? (
        <div className="flex flex-col items-center gap-md py-4xl text-center">
          <div
            className="w-12 h-12 rounded-pill flex items-center justify-center"
            style={{ background: "var(--fill-tertiary)" }}
          >
            <Dumbbell size={20} className="text-fg-tertiary" />
          </div>
          <p className="text-sm text-fg-tertiary m-0">Sin ejercicios registrados</p>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {blocks.map((block, idx) => {
            if (block.kind === "standalone") {
              return (
                <ExerciseCard
                  key={block.exercise.id}
                  exercise={block.exercise}
                  defaultExpanded={idx < 3}
                />
              );
            }
            if (block.kind === "superset") {
              const label = block.exercises.map((e) => e.name).join(" + ");
              return (
                <SupersetBlock
                  key={block.groupId}
                  groupId={block.groupId}
                  exercises={block.exercises}
                  label={label}
                />
              );
            }
            // legacy superset
            return (
              <ExerciseCard
                key={block.exercise.id}
                exercise={block.exercise}
                defaultExpanded={idx < 3}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
