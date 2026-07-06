"use client";

import React, { useState } from "react";
import {
  ChevronUp,
  ChevronRight,
  Settings2,
  Trash2,
  Plus,
  Pencil,
  Images,
  Users,
  MessageCircle,
  Link2,
  Unlink2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SetsTable, EditableSet, routineSetToEditable, editableToRoutineSet } from "./SetsTable";
import { VariablesConfigModal } from "./VariablesConfigModal";
import { ExerciseCommentsModal } from "./ExerciseCommentsModal";
import { ExerciseGalleryModal } from "./ExerciseGalleryModal";
import { ExerciseNameSearch } from "./ExerciseNameSearch";
import { resolveVariablesConfig } from "@/lib/exercise-presets";
import type { RoutineExercise, VariablesConfig, ExerciseType } from "@/lib/api/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Bloque de ejercicio editable en el RoutineEditor */
export interface ExerciseBlockData {
  /** ID interno (RoutineExercise.id si es existente, o generado para nuevos) */
  _key: string;
  /**
   * routine_exercise_id real del backend (null si bloque nuevo no guardado).
   * Se usa para cargar comentarios.
   */
  routine_exercise_id: number | null;
  /** exercise_id del catálogo (para galería). */
  exercise_id: number | null;
  name: string;
  exercise_type: ExerciseType;
  is_warmup: boolean;
  variables_config: VariablesConfig;
  sets: EditableSet[];
  notes?: string;
  order_index: number;
  /** 0 = principal, 1+ = suplente */
  variant_order: number;
  /** UUID v4 del grupo superset; null = ejercicio suelto. */
  superset_group: string | null;
}

/**
 * Grupo de variantes del mismo ejercicio. Todos los miembros comparten order_index.
 */
export interface ExerciseGroup {
  groupKey: string;
  variants: ExerciseBlockData[];
}

/**
 * Agrupa una lista plana de bloques por order_index.
 * Los miembros de cada grupo se ordenan por variant_order.
 */
export function groupVariants(blocks: ExerciseBlockData[]): ExerciseGroup[] {
  const map = new Map<number, ExerciseBlockData[]>();
  for (const b of blocks) {
    const existing = map.get(b.order_index);
    if (existing) {
      existing.push(b);
    } else {
      map.set(b.order_index, [b]);
    }
  }

  // Ordenar por order_index
  const sortedKeys = Array.from(map.keys()).sort((a, b) => a - b);

  return sortedKeys.map((orderIndex) => {
    const variants = (map.get(orderIndex) ?? []).sort(
      (a, b) => a.variant_order - b.variant_order
    );
    return {
      // Key estable basada en la primera variante → no remonta al reordenar/combinar.
      groupKey: variants[0]?._key ?? `group-${orderIndex}`,
      variants,
    };
  });
}

// ─── Props del ExerciseBlock ──────────────────────────────────────────────────

interface ExerciseBlockProps {
  /** Todas las variantes del grupo, ordenadas por variant_order */
  variants: ExerciseBlockData[];
  /** Índice visible del grupo (0-based) en la lista del editor */
  groupIndex: number;
  /** Total de grupos (para el OrderBadge) */
  totalGroups: number;
  readOnly?: boolean;
  onUpdate: (key: string, updated: Partial<ExerciseBlockData>) => void;
  onRemove: (key: string) => void;
  /** Reordena el GRUPO a una posición 1-based (mueve todas sus variantes). */
  onReorderGroup: (orderIndex: number, newGroupPosition: number) => void;
  /** Callback para agregar suplente — crea una variante sin nombre en el grupo */
  onAddVariant: (orderIndex: number) => void;
  /**
   * Estado inicial de expansión. Si se omite, se auto-expande solo el primer
   * grupo con nombre (comportamiento del editor de rutinas).
   */
  defaultExpanded?: boolean;
  // ── Combine mode (opcionales — no pasan desde WeekRoutineExercisesEditor) ──
  /** Arranca el modo combinar con este grupo como primer seleccionado. */
  onStartCombine?: () => void;
  /**
   * Saca este ejercicio de su grupo de superset. Se pasa solo a miembros de un
   * grupo combinado → el botón "combinar" muta a "descombinar" (rojo, cadena rota).
   */
  onRemoveFromGroup?: () => void;
  /** Si true, el editor está en modo "seleccionar para combinar". */
  combineMode?: boolean;
  /** Si true, este grupo está seleccionado para ser combinado. */
  combineSelected?: boolean;
  /** Toggle la selección de este grupo. */
  onToggleCombineSelect?: () => void;
}

// ─── OrderBadge ──────────────────────────────────────────────────────────────

const OrderBadge: React.FC<{
  groupIndex: number;
  totalGroups: number;
  readOnly: boolean;
  onReorder: (newPosition: number) => void;
}> = ({ groupIndex, totalGroups, readOnly, onReorder }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(groupIndex + 1));

  const colorStyle: React.CSSProperties = {
    background: "var(--fill-tertiary)",
    color: "var(--fg-secondary)",
  };

  const commit = () => {
    setEditing(false);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= totalGroups && n !== groupIndex + 1) {
      onReorder(n);
    } else {
      setVal(String(groupIndex + 1));
    }
  };

  if (editing && !readOnly) {
    return (
      <input
        autoFocus
        type="number"
        min={1}
        max={totalGroups}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setVal(String(groupIndex + 1));
            setEditing(false);
          }
        }}
        className="w-8 h-8 rounded-sm text-center text-sm font-bold outline-none border border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
        style={colorStyle}
        aria-label="Posición del ejercicio"
      />
    );
  }

  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={() => {
        if (readOnly) return;
        setVal(String(groupIndex + 1));
        setEditing(true);
      }}
      className="w-8 h-8 rounded-sm flex items-center justify-center text-sm font-bold flex-shrink-0 transition-opacity hover:opacity-80 disabled:cursor-default"
      style={colorStyle}
      title={readOnly ? undefined : "Cambiar orden"}
    >
      {groupIndex + 1}
    </button>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * ExerciseBlock — renderiza un GRUPO de variantes como 3 cards apiladas (info,
 * comentarios, series). Maneja la variante activa internamente con useState.
 */
export const ExerciseBlock: React.FC<ExerciseBlockProps> = ({
  variants,
  groupIndex,
  totalGroups,
  readOnly = false,
  onUpdate,
  onRemove,
  onReorderGroup,
  onAddVariant,
  onStartCombine,
  onRemoveFromGroup,
  combineMode = false,
  combineSelected = false,
  onToggleCombineSelect,
  defaultExpanded,
}) => {
  // Auto-expandir solo el primer ejercicio de una rutina ya cargada (con nombre),
  // salvo que el contenedor fuerce un estado inicial con `defaultExpanded`.
  const [expanded, setExpanded] = useState(
    defaultExpanded ?? (groupIndex === 0 && !!variants[0]?.name)
  );
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const [showVarsModal, setShowVarsModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showRemoveVariantConfirm, setShowRemoveVariantConfirm] = useState(false);
  /** Key de la variante pendiente de borrar — se resuelve en el onClick, no en el onConfirm. */
  const [pendingRemoveVariantKey, setPendingRemoveVariantKey] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  /** _key de la variante con el buscador inline abierto (null = ninguno). */
  const [namingKey, setNamingKey] = useState<string | null>(null);
  /** Variantes cuyo buscador fue cancelado manualmente (para no reabrirlo). */
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(
    () => new Set()
  );

  // Variante activa (clampeada al rango válido)
  const safeIdx = Math.min(activeVariantIdx, variants.length - 1);
  const data = variants[safeIdx];

  // ¿Este ejercicio pertenece a un grupo de superset? (combinado)
  const isCombined = variants.some((v) => v.superset_group != null);

  // Auto-abrir el buscador inline cuando la variante activa no tiene nombre
  // (ej. recién agregada) y no fue cancelada manualmente.
  React.useEffect(() => {
    if (!data) return;
    if (
      !readOnly &&
      !data.name &&
      namingKey !== data._key &&
      !dismissedKeys.has(data._key)
    ) {
      setNamingKey(data._key);
    }
  }, [data?._key, data?.name, readOnly, namingKey, dismissedKeys, data]);

  if (!data) return null;

  // ─── Render en modo combinar ─────────────────────────────────────────────
  // Cuando combineMode=true, renderizamos solo una card compacta con checkbox.
  if (combineMode) {
    return (
      <button
        type="button"
        onClick={onToggleCombineSelect}
        className="w-full flex items-center gap-md px-xl py-md text-left rounded-lg transition-all"
        style={{
          border: combineSelected
            ? "2px solid var(--warning)"
            : "2px solid var(--separator-subtle)",
          background: combineSelected
            ? "var(--warning-alpha-08)"
            : "var(--fill-tertiary)",
        }}
      >
        {/* Checkbox visual */}
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            border: combineSelected
              ? "2px solid var(--warning)"
              : "2px solid var(--separator)",
            background: combineSelected
              ? "var(--warning-alpha-20)"
              : "transparent",
          }}
          aria-checked={combineSelected}
          role="checkbox"
        >
          {combineSelected && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M2 6l3 3 5-5"
                stroke="var(--warning)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>

        {/* Nombre + resumen */}
        <div className="flex-1 min-w-0">
          <span
            className={[
              "text-base truncate block",
              data.name ? "font-semibold text-fg" : "font-medium italic text-fg-tertiary",
            ].join(" ")}
          >
            {data.name || "Sin nombre"}
          </span>
          <p className="text-xs text-fg-tertiary m-0 mt-xxs">
            {data.sets.length} {data.sets.length === 1 ? "serie" : "series"}
          </p>
        </div>

        {/* Número de orden */}
        <span
          className="w-7 h-7 rounded-sm flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{
            background: "var(--fill-tertiary)",
            color: "var(--fg-tertiary)",
          }}
        >
          {groupIndex + 1}
        </span>
      </button>
    );
  }

  const isNaming = !readOnly && namingKey === data._key;

  const openNaming = (key: string) => {
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setNamingKey(key);
  };

  const cancelNaming = (key: string) => {
    setNamingKey((cur) => (cur === key ? null : cur));
    setDismissedKeys((prev) => new Set(prev).add(key));
  };

  const selectExerciseName = (
    key: string,
    name: string,
    exerciseId: number | null
  ) => {
    onUpdate(key, { name, exercise_id: exerciseId });
    setNamingKey((cur) => (cur === key ? null : cur));
  };

  const config = resolveVariablesConfig(data.variables_config, data.exercise_type);
  const hasMultipleVariants = variants.length > 1;

  // ─── Resumen colapsado ──────────────────────────────────────────────────────

  const setCount = data.sets.length;
  const summaryParts: string[] = [
    `${setCount} ${setCount === 1 ? "serie" : "series"}`,
  ];

  if (config.variables.find((v) => v.key === "reps")) {
    const repsVals = data.sets
      .map((s) => Number(s.reps))
      .filter((n) => !isNaN(n) && n > 0);
    if (repsVals.length > 0) {
      const minReps = Math.min(...repsVals);
      const maxReps = Math.max(...repsVals);
      summaryParts.push(
        minReps === maxReps ? `${minReps} reps` : `${minReps}-${maxReps} reps`
      );
    }
  }
  const restTimes = data.sets
    .map((s) => Number(s.rest_time))
    .filter((n) => !isNaN(n) && n > 0);
  if (restTimes.length > 0) {
    summaryParts.push(`${Math.round(restTimes[0])}s descanso`);
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSetChange = (idx: number, key: string, value: string) => {
    const newSets = [...data.sets];
    if (key.startsWith("_custom_")) {
      const customKey = key.replace("_custom_", "");
      newSets[idx] = {
        ...newSets[idx],
        _customVars: { ...(newSets[idx]._customVars ?? {}), [customKey]: value },
      };
    } else {
      const updated = { ...newSets[idx] } as Record<string, unknown>;
      updated[key] = value;
      newSets[idx] = updated as EditableSet;
    }
    onUpdate(data._key, { sets: newSets });
  };

  const handleAddSet = () => {
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
    const newSets = data.sets.map((set) => {
      const routineSet = editableToRoutineSet(set, config);
      return routineSetToEditable(routineSet, newConfig);
    });
    onUpdate(data._key, { variables_config: newConfig, sets: newSets });
  };

  // ─── Render colapsado ───────────────────────────────────────────────────────

  if (!expanded) {
    return (
      <>
        <GradientSurface>
          <div className="w-full flex items-center gap-md px-xl py-md text-left">
            <OrderBadge
              groupIndex={groupIndex}
              totalGroups={totalGroups}
              readOnly={readOnly}
              onReorder={(pos) => onReorderGroup(data.order_index, pos)}
            />

            {isNaming ? (
              /* Buscador inline en la card contraída (compacto, sin detalle) */
              <ExerciseNameSearch
                onSelect={(name, exId) => selectExerciseName(data._key, name, exId)}
                onCancel={() => cancelNaming(data._key)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex-1 flex flex-col min-w-0 text-left hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-sm flex-wrap">
                  <span
                    className={[
                      "text-base truncate",
                      data.name
                        ? "font-semibold text-fg"
                        : "font-medium italic text-fg-tertiary",
                    ].join(" ")}
                  >
                    {data.name || "Elegir ejercicio"}
                  </span>
                  {data.is_warmup && (
                    <Badge variant="warning" size="sm">
                      Calentamiento
                    </Badge>
                  )}
                  {hasMultipleVariants && (
                    <Badge variant="primary" size="sm">
                      {variants.length - 1}{" "}
                      {variants.length - 1 === 1 ? "variante" : "variantes"}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-fg-tertiary m-0 mt-xxs">
                  {summaryParts.join(" · ")}
                </p>
              </button>
            )}

            {/* Acciones — siempre visibles, a la derecha */}
            <div className="flex items-center gap-xs flex-shrink-0">
              {!readOnly && (
                <IconButton
                  title="Cambiar ejercicio"
                  onClick={() => openNaming(data._key)}
                  iconColor="var(--primary)"
                  bg="var(--primary-alpha-12)"
                >
                  <Pencil size={15} />
                </IconButton>
              )}
              {/* Combinar (ámbar) si no está combinado; descombinar (rojo) si lo está */}
              {!readOnly && isCombined && onRemoveFromGroup ? (
                <IconButton
                  title="Sacar de la combinación"
                  onClick={onRemoveFromGroup}
                  iconColor="var(--destructive)"
                  bg="var(--destructive-alpha-12)"
                >
                  <Unlink2 size={15} />
                </IconButton>
              ) : (
                !readOnly &&
                onStartCombine && (
                  <IconButton
                    title="Combinar ejercicios (superset)"
                    onClick={onStartCombine}
                    iconColor="var(--warning)"
                    bg="var(--warning-alpha-20)"
                  >
                    <Link2 size={15} />
                  </IconButton>
                )
              )}
              {/* Personalizar variables */}
              <IconButton
                title="Personalizar variables"
                onClick={() => setShowVarsModal(true)}
                disabled={readOnly}
              >
                <Settings2 size={15} />
              </IconButton>
              {!readOnly && (
                <button
                  type="button"
                  title="Eliminar ejercicio"
                  aria-label="Eliminar ejercicio"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-pill transition-opacity hover:opacity-80"
                  style={{
                    background: "var(--destructive-alpha-12)",
                    color: "var(--destructive)",
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        </GradientSurface>

        <VariablesConfigModal
          open={showVarsModal}
          onClose={() => setShowVarsModal(false)}
          currentConfig={config}
          onSave={handleSaveVarsConfig}
        />

        <ConfirmDialog
          open={showRemoveConfirm}
          title="Eliminar ejercicio"
          description={`¿Quitar "${data.name}" de la rutina? Esta acción se aplica al guardar.`}
          confirmLabel="Eliminar"
          confirmVariant="danger"
          onConfirm={() => {
            setShowRemoveConfirm(false);
            for (const v of variants) {
              onRemove(v._key);
            }
          }}
          onClose={() => setShowRemoveConfirm(false)}
        />
      </>
    );
  }

  // ─── Render expandido (3 cards apiladas) ────────────────────────────────────

  return (
    <div className="flex flex-col gap-sm">
      {/* ── Contenedor único: info + variantes + comentarios + series ── */}
      <GradientSurface>
        <div className="px-xl py-lg flex flex-col gap-md">
          {/* Fila 1: Número + Nombre + Acciones */}
          <div className="flex items-center gap-md">
            <OrderBadge
              groupIndex={groupIndex}
              totalGroups={totalGroups}
              readOnly={readOnly}
              onReorder={(pos) => onReorderGroup(data.order_index, pos)}
            />
            {isNaming ? (
              <ExerciseNameSearch
                onSelect={(name, exId) => selectExerciseName(data._key, name, exId)}
                onCancel={() => cancelNaming(data._key)}
              />
            ) : data.name ? (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                title="Contraer"
                className="flex-1 min-w-0 text-left cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-sm flex-wrap">
                  <span className="text-base font-semibold text-fg">
                    {data.name}
                  </span>
                  {data.is_warmup && (
                    <Badge variant="warning" size="sm">
                      Calentamiento
                    </Badge>
                  )}
                </div>
              </button>
            ) : (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm flex-wrap">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => openNaming(data._key)}
                    className="text-base font-medium italic text-fg-tertiary disabled:cursor-default"
                  >
                    Elegir ejercicio
                  </button>
                  {data.is_warmup && (
                    <Badge variant="warning" size="sm">
                      Calentamiento
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Iconos de acciones — editar primero */}
            <div className="flex items-center gap-xs flex-shrink-0">
              {/* Editar ejercicio (buscador inline) — solo si no readOnly */}
              {!readOnly && (
                <IconButton
                  title="Cambiar ejercicio"
                  onClick={() => openNaming(data._key)}
                  iconColor="var(--primary)"
                  bg="var(--primary-alpha-12)"
                >
                  <Pencil size={15} />
                </IconButton>
              )}

              {/* Combinar (ámbar) si no está combinado; descombinar (rojo) si lo está */}
              {!readOnly && isCombined && onRemoveFromGroup ? (
                <IconButton
                  title="Sacar de la combinación"
                  onClick={onRemoveFromGroup}
                  iconColor="var(--destructive)"
                  bg="var(--destructive-alpha-12)"
                >
                  <Unlink2 size={15} />
                </IconButton>
              ) : (
                !readOnly &&
                onStartCombine && (
                  <IconButton
                    title="Combinar ejercicios (superset)"
                    onClick={onStartCombine}
                    iconColor="var(--warning)"
                    bg="var(--warning-alpha-20)"
                  >
                    <Link2 size={15} />
                  </IconButton>
                )
              )}

              {/* Variables config */}
              <IconButton
                title="Personalizar variables"
                onClick={() => setShowVarsModal(true)}
                disabled={readOnly}
              >
                <Settings2 size={15} />
              </IconButton>

              {/* Colapsar */}
              <IconButton title="Colapsar" onClick={() => setExpanded(false)}>
                <ChevronUp size={15} />
              </IconButton>
            </div>
          </div>

          {/* Sección VARIANTES (solo si hay más de una variante) */}
          {hasMultipleVariants && (
            <div className="flex flex-col gap-xs">
              <span
                className="text-xxs font-semibold uppercase"
                style={{ color: "var(--primary)", letterSpacing: "1px" }}
              >
                Variantes
              </span>
              <div
                className="relative rounded-md overflow-hidden p-[2px]"
                style={{ border: "1px solid var(--primary-alpha-20)" }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                  }}
                />
                <div className="relative flex gap-xs overflow-x-auto">
                  {variants.map((v, vIdx) => {
                    const isActive = vIdx === safeIdx;
                    return (
                      <button
                        key={v._key}
                        type="button"
                        onClick={() => setActiveVariantIdx(vIdx)}
                        className="px-lg py-xs rounded-sm text-sm whitespace-nowrap flex-shrink-0 transition-colors"
                        style={
                          isActive
                            ? {
                                background: "var(--primary-alpha-12)",
                                color: "var(--primary)",
                                fontWeight: 600,
                              }
                            : { background: "transparent", color: "var(--fg-secondary)" }
                        }
                      >
                        {v.name || (vIdx === 0 ? "Principal" : `Suplente ${vIdx}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Fila 2: Pills galería + suplente */}
          <div className="flex gap-sm">
            {/* Ver galería — siempre visible; deshabilitado sin ejercicio elegido */}
            <button
              type="button"
              disabled={data.exercise_id === null}
              onClick={() => data.exercise_id !== null && setShowGallery(true)}
              title={
                data.exercise_id === null
                  ? "Elegí un ejercicio primero"
                  : undefined
              }
              className="flex-1 flex items-center justify-center gap-xs rounded-pill py-[6px] text-sm font-semibold border transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--primary-alpha-12)",
                borderColor: "var(--primary-alpha-12)",
                color: "var(--primary)",
              }}
            >
              <Images size={14} />
              Ver galería
            </button>

            {/* Añadir suplente — solo si no readOnly */}
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  onAddVariant(data.order_index);
                  // La variante nueva se agrega al final del grupo → activarla.
                  setActiveVariantIdx(variants.length);
                }}
                className="flex-1 flex items-center justify-center gap-xs rounded-pill py-[6px] text-sm font-semibold border transition-colors hover:opacity-80"
                style={{
                  background: "var(--primary-alpha-12)",
                  borderColor: "var(--primary-alpha-12)",
                  color: "var(--primary)",
                }}
              >
                <Users size={14} />
                Añadir suplente
              </button>
            )}
          </div>

          {/* Sección: Comentarios — siempre visible (incluso en ejercicios/suplentes sin guardar) */}
          <CommentsPreviewCard
            routineExerciseId={data.routine_exercise_id}
            onViewAll={() => {
              if (data.routine_exercise_id !== null) setShowComments(true);
            }}
          />

          {/* Sección: Series */}
          <div className="flex flex-col gap-md">
            <div className="flex flex-col gap-sm">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--fg-tertiary)" }}
              >
                Series
              </span>
              <SetsTable
                sets={data.sets}
                config={config}
                exerciseType={data.exercise_type}
                isWarmup={data.is_warmup}
                readOnly={readOnly}
                onSetChange={handleSetChange}
                onAddSet={handleAddSet}
                onRemoveSet={handleRemoveSet}
                hideAddButton
              />
            </div>

            {/* Acciones: eliminar (izquierda) + añadir serie (derecha) */}
            {!readOnly && (
              <div className="flex items-center gap-sm">
                <Button
                  type="button"
                  variant="dangerSoft"
                  size="md"
                  className="flex-1"
                  iconLeft={<Trash2 size={16} />}
                  onClick={() => {
                    // Si la variante activa es un suplente → quitar solo esa variante.
                    if (safeIdx > 0) {
                      setPendingRemoveVariantKey(data._key);
                      setActiveVariantIdx(Math.max(0, safeIdx - 1));
                      setShowRemoveVariantConfirm(true);
                    } else {
                      // Principal → eliminar el grupo completo.
                      setShowRemoveConfirm(true);
                    }
                  }}
                >
                  {safeIdx > 0 ? "Quitar suplente" : "Eliminar ejercicio"}
                </Button>
                <Button
                  type="button"
                  variant="primarySoft"
                  size="md"
                  className="flex-1"
                  iconLeft={<Plus size={16} />}
                  onClick={handleAddSet}
                >
                  Añadir serie
                </Button>
              </div>
            )}
          </div>
        </div>
      </GradientSurface>

      {/* ── Modales ── */}

      <VariablesConfigModal
        open={showVarsModal}
        onClose={() => setShowVarsModal(false)}
        currentConfig={config}
        onSave={handleSaveVarsConfig}
      />

      <ConfirmDialog
        open={showRemoveConfirm}
        title="Eliminar ejercicio"
        description={`¿Quitar "${data.name}" de la rutina? Esta acción se aplica al guardar.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={() => {
          setShowRemoveConfirm(false);
          // Eliminar todas las variantes del grupo
          for (const v of variants) {
            onRemove(v._key);
          }
        }}
        onClose={() => setShowRemoveConfirm(false)}
      />

      <ConfirmDialog
        open={showRemoveVariantConfirm}
        title="Quitar suplente"
        description="¿Quitar esta variante del grupo?"
        confirmLabel="Quitar"
        confirmVariant="danger"
        onConfirm={() => {
          setShowRemoveVariantConfirm(false);
          if (pendingRemoveVariantKey !== null) {
            onRemove(pendingRemoveVariantKey);
            setPendingRemoveVariantKey(null);
          }
        }}
        onClose={() => {
          setShowRemoveVariantConfirm(false);
          setPendingRemoveVariantKey(null);
        }}
      />

      {data.routine_exercise_id !== null && (
        <ExerciseCommentsModal
          open={showComments}
          onClose={() => setShowComments(false)}
          routineExerciseId={data.routine_exercise_id}
          exerciseName={data.name}
        />
      )}

      {data.exercise_id !== null && (
        <ExerciseGalleryModal
          open={showGallery}
          onClose={() => setShowGallery(false)}
          exerciseId={data.exercise_id}
          exerciseName={data.name}
        />
      )}
    </div>
  );
};

// ─── CommentsPreviewCard ──────────────────────────────────────────────────────

interface CommentsPreviewCardProps {
  /** null = ejercicio/suplente aún no guardado (sin id) → sin comentarios todavía. */
  routineExerciseId: number | null;
  onViewAll: () => void;
}

/**
 * Carga el último comentario del ejercicio y lo muestra en una card compacta.
 * Usa lazy-load (carga al montar, no al abrir el modal).
 * Si el ejercicio aún no fue guardado (id null), muestra un hint en vez de cargar.
 */
const CommentsPreviewCard: React.FC<CommentsPreviewCardProps> = ({
  routineExerciseId,
  onViewAll,
}) => {
  const isSaved = routineExerciseId !== null;
  const [loading, setLoading] = useState(isSaved);
  // null = cargando, undefined = sin comentarios
  const [lastComment, setLastComment] = useState<
    | {
        id: number;
        content: string;
        author: { id: number; username: string; avatar_url: string | null };
      }
    | undefined
  >(undefined);

  const [commentCount, setCommentCount] = useState(0);

  React.useEffect(() => {
    if (routineExerciseId === null) {
      setLoading(false);
      setLastComment(undefined);
      setCommentCount(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    import("@/lib/api/comments")
      .then(({ getExerciseComments }) => getExerciseComments(routineExerciseId))
      .then((comments) => {
        if (cancelled) return;
        setCommentCount(comments.length);
        if (comments.length > 0) {
          const sorted = [...comments].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setLastComment(sorted[0]);
        } else {
          setLastComment(undefined);
        }
      })
      .catch(() => {
        if (!cancelled) setLastComment(undefined);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routineExerciseId]);

  return (
    <div className="flex flex-col gap-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--fg-tertiary)" }}
        >
          Comentarios
        </span>
        {commentCount >= 1 && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-xxs text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--primary)" }}
          >
            Ver todos
            <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Contenido en card contenedora */}
      <div
        className="rounded-lg p-md"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--separator-subtle)",
        }}
      >
        {loading ? (
          /* Skeleton compacto, misma altura que el estado vacío (1 fila) */
          <div className="flex items-center gap-sm">
            <div
              className="w-4 h-4 rounded-full animate-pulse flex-shrink-0"
              style={{ background: "var(--fill-tertiary)" }}
            />
            <div
              className="h-3 rounded animate-pulse"
              style={{ background: "var(--fill-tertiary)", width: "50%" }}
            />
          </div>
        ) : lastComment ? (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-start gap-sm text-left w-full hover:opacity-80 transition-opacity"
          >
            <Avatar
              src={lastComment.author.avatar_url}
              initials={lastComment.author.username.slice(0, 2)}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-fg block truncate">
                {lastComment.author.username}
              </span>
              <p
                className="text-sm m-0 overflow-hidden"
                style={{
                  color: "var(--fg-secondary)",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {lastComment.content}
              </p>
            </div>
          </button>
        ) : !isSaved ? (
          <div className="flex items-center gap-sm text-fg-tertiary">
            <MessageCircle size={16} className="opacity-50" />
            <span className="text-sm">Guardá la rutina para agregar comentarios</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-sm text-fg-tertiary hover:opacity-80 transition-opacity w-full"
          >
            <MessageCircle size={16} className="opacity-50" />
            <span className="text-sm">Sin comentarios aún</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ─── IconButton helper ────────────────────────────────────────────────────────

const IconButton: React.FC<{
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  /** Color del ícono (default: fg-tertiary). */
  iconColor?: string;
  /** Fondo del botón (default: fill-tertiary). */
  bg?: string;
}> = ({ title, onClick, disabled = false, children, iconColor, bg }) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center rounded-pill transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
    style={{
      background: bg ?? "var(--fill-tertiary)",
      color: iconColor ?? "var(--fg-tertiary)",
    }}
  >
    {children}
  </button>
);

// ─── Helpers de conversión ────────────────────────────────────────────────────

/**
 * Convierte RoutineExercise del backend a ExerciseBlockData (estado interno del editor).
 */
export function routineExerciseToBlock(re: RoutineExercise): ExerciseBlockData {
  const resolvedType: ExerciseType =
    re.exercise_type === "normal" || re.exercise_type === "warmup"
      ? "weight"
      : re.exercise_type === "warmup_timed"
      ? "timed"
      : (re.exercise_type as ExerciseType) ?? "weight";

  const config = resolveVariablesConfig(re.variables_config, resolvedType);

  let sets: EditableSet[];
  if (re.sets_data && re.sets_data.length > 0) {
    sets = re.sets_data.map((s) => routineSetToEditable(s, config));
  } else {
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
    routine_exercise_id: re.id ?? null,
    exercise_id: re.exercise_id ?? null,
    name: re.name,
    exercise_type: resolvedType,
    is_warmup: re.is_warmup ?? false,
    variables_config: config,
    sets,
    notes: re.notes ?? undefined,
    order_index: re.order_index,
    variant_order: re.variant_order ?? 0,
    superset_group: re.superset_group ?? null,
  };
}
