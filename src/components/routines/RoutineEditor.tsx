"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Trash2, Save, Plus, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DayBadge } from "@/components/ui/DayBadge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";

import { ExerciseBlock, ExerciseBlockData, routineExerciseToBlock } from "./ExerciseBlock";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { editableToRoutineSet } from "./SetsTable";

import { getRoutine, createRoutine, updateRoutine, deleteRoutine } from "@/lib/api/routines";
import { getStudentRoutine, updateStudentRoutine } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { resolveVariablesConfig, getPresetVariablesConfig, buildEmptySet } from "@/lib/exercise-presets";
import type { Routine, DayOfWeek, ExerciseType, RoutineExerciseSet, VariablesConfig } from "@/lib/api/types";
// RoutineExerciseSet y VariablesConfig usados en buildRoutinePayload
import type { ExerciseCatalogItem } from "@/lib/api/exercises";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type RoutineEditorMode = "create-own" | "edit-own" | "edit-coach";

export interface RoutineSeed {
  title: string;
  description?: string;
  day_of_week?: DayOfWeek[];
}

interface RoutineEditorProps {
  mode: RoutineEditorMode;
  routineId?: number;
  studentId?: number;
  initialSeed?: RoutineSeed;
}

// ─── Schema zod ───────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "El nombre es requerido").max(120),
  description: z.string().max(500).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

// ─── Days of week config ──────────────────────────────────────────────────────

const ALL_DAYS: { key: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"; dow: DayOfWeek; label: string }[] = [
  { key: "mon", dow: "monday",    label: "Lun" },
  { key: "tue", dow: "tuesday",   label: "Mar" },
  { key: "wed", dow: "wednesday", label: "Mié" },
  { key: "thu", dow: "thursday",  label: "Jue" },
  { key: "fri", dow: "friday",    label: "Vie" },
  { key: "sat", dow: "saturday",  label: "Sáb" },
  { key: "sun", dow: "sunday",    label: "Dom" },
];

// ─── Helpers de payload ───────────────────────────────────────────────────────

interface RoutinePayload {
  title: string;
  description: string | null;
  day_of_week: DayOfWeek[];
  exercises: Array<{
    exercise_id?: number | null;
    name: string;
    series: number;
    repetitions: number;
    exercise_type: string;
    is_warmup: boolean;
    order_index: number;
    sets_data: RoutineExerciseSet[];
    variables_config?: VariablesConfig;
  }>;
}

function buildRoutinePayload(
  values: FormValues,
  selectedDays: DayOfWeek[],
  blocks: ExerciseBlockData[]
): RoutinePayload {
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    day_of_week: selectedDays,
    exercises: blocks.map((block, idx) => {
      const config = resolveVariablesConfig(block.variables_config, block.exercise_type);
      const sets_data = block.sets.map((s) => editableToRoutineSet(s, config));
      return {
        exercise_id: block.exercise_id ?? null,
        name: block.name,
        series: block.sets.length,
        repetitions: 0, // calculado por el backend
        exercise_type: block.exercise_type,
        is_warmup: block.is_warmup,
        order_index: idx,
        sets_data,
        variables_config: config,
      };
    }),
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * RoutineEditor — editor compartido para crear / editar rutinas propias o del alumno.
 *
 * Modos:
 * - create-own: nueva rutina del coach
 * - edit-own: editar rutina propia del coach
 * - edit-coach: editar rutina del alumno (solo si created_by === user.id)
 */
export const RoutineEditor: React.FC<RoutineEditorProps> = ({
  mode,
  routineId,
  studentId,
  initialSeed,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  // ─── Estado ───────────────────────────────────────────────────────────────

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(mode !== "create-own");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [blocks, setBlocks] = useState<ExerciseBlockData[]>([]);

  // Authorship para modo edit-coach
  const [isReadOnly, setIsReadOnly] = useState(false);

  // ─── React Hook Form ──────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialSeed?.title ?? "",
      description: initialSeed?.description ?? "",
    },
  });

  // ─── Carga inicial ────────────────────────────────────────────────────────

  useEffect(() => {
    if (mode === "create-own") {
      setLoading(false);
      setSelectedDays(initialSeed?.day_of_week ?? []);
      return;
    }

    if (!routineId) {
      setLoadError("ID de rutina no especificado.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        let r: Routine;
        if (mode === "edit-coach" && studentId) {
          r = await getStudentRoutine(studentId, routineId);
        } else {
          r = await getRoutine(routineId);
        }

        setRoutine(r);
        reset({ title: r.title, description: r.description ?? "" });

        const days = r.day_of_week
          ? Array.isArray(r.day_of_week)
            ? r.day_of_week
            : [r.day_of_week]
          : [];
        setSelectedDays(days);

        const loadedBlocks = (r.exercises ?? [])
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map(routineExerciseToBlock);
        setBlocks(loadedBlocks);

        // Authorship: read-only si mode=edit-coach y created_by !== user.id
        if (mode === "edit-coach" && user && r.created_by !== user.id) {
          setIsReadOnly(true);
        }
      } catch (err) {
        setLoadError(getErrorMessage(err, "No se pudo cargar la rutina."));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mode, routineId, studentId, user, reset, initialSeed]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleToggleDay = (dow: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]
    );
  };

  const handleUpdateBlock = useCallback(
    (key: string, updated: Partial<ExerciseBlockData>) => {
      setBlocks((prev) =>
        prev.map((b) => (b._key === key ? { ...b, ...updated } : b))
      );
    },
    []
  );

  const handleRemoveBlock = useCallback((key: string) => {
    setBlocks((prev) => prev.filter((b) => b._key !== key));
  }, []);

  const handleMoveUp = useCallback((key: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b._key === key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((key: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b._key === key);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const handleSelectExercise = (
    ex: ExerciseCatalogItem,
    exerciseType: ExerciseType
  ) => {
    const config =
      exerciseType === "custom"
        ? { version: 1 as const, variables: [] }
        : getPresetVariablesConfig(exerciseType);

    const defaultSetRaw = buildEmptySet(config);
    const defaultSet: Record<string, string> = {};
    for (const [k, v] of Object.entries(defaultSetRaw)) {
      if (typeof v === "string") {
        defaultSet[k] = v;
      }
    }
    if (exerciseType === "superset") {
      defaultSet.alias = "A";
    }

    const newBlock: ExerciseBlockData = {
      _key: `new-${Date.now()}-${Math.random()}`,
      exercise_id: ex.id,
      name: ex.name,
      exercise_type: exerciseType,
      is_warmup: false,
      variables_config: config,
      sets: [defaultSet],
      order_index: blocks.length,
    };

    setBlocks((prev) => [...prev, newBlock]);
  };

  const onSubmit = handleSubmit(async (values) => {
    // Defensa en profundidad para authorship
    if (isReadOnly) {
      setSaveError("No tenés permiso para editar esta rutina.");
      return;
    }

    if (mode === "edit-coach" && routine && user && routine.created_by !== user.id) {
      setSaveError("No tenés permiso para editar esta rutina (no sos el autor).");
      return;
    }

    if (blocks.length === 0) {
      setSaveError("Agregá al menos un ejercicio antes de guardar.");
      return;
    }

    // Validar que cada bloque tenga al menos 1 serie
    for (const block of blocks) {
      if (block.sets.length === 0) {
        setSaveError(`El ejercicio "${block.name}" no tiene series. Agregá al menos 1.`);
        return;
      }
    }

    // Validar alias en supersets
    for (const block of blocks) {
      if (block.exercise_type === "superset") {
        for (let i = 0; i < block.sets.length; i++) {
          if (!block.sets[i].alias) {
            setSaveError(
              `El ejercicio "${block.name}" (superset) tiene una serie sin alias. Completá el campo Alias.`
            );
            return;
          }
        }
      }
    }

    setSaveError(null);
    setSaving(true);

    try {
      const payload = buildRoutinePayload(values, selectedDays, blocks);
      // El backend acepta el mismo shape RoutinePayload en Create/Update aunque Partial<Routine> sea más estricto en el tipo TS.
      const partialPayload = payload as unknown as Partial<Routine>;

      if (mode === "create-own") {
        const created = await createRoutine(partialPayload);
        setSavedSuccess(true);
        setTimeout(() => {
          router.push(`/routines/${created.id}`);
        }, 800);
      } else if (mode === "edit-own" && routineId) {
        await updateRoutine(routineId, partialPayload);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      } else if (mode === "edit-coach" && routineId && studentId) {
        await updateStudentRoutine(studentId, routineId, partialPayload);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo guardar la rutina."));
    } finally {
      setSaving(false);
    }
  });

  const handleDuplicate = async () => {
    if (!routine) return;
    setSaving(true);
    try {
      const values = {
        title: `${routine.title} (copia)`,
        description: routine.description ?? "",
      };
      const payload = buildRoutinePayload(values as FormValues, selectedDays, blocks);
      const created = await createRoutine(payload as unknown as Partial<Routine>);
      router.push(`/routines/${created.id}`);
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo duplicar la rutina."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!routineId) return;
    setDeleting(true);
    try {
      await deleteRoutine(routineId);
      router.push("/routines");
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo eliminar la rutina."));
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-xxl max-w-4xl">
        <SkeletonBox height={52} />
        <SkeletonBox height={120} />
        <SkeletonBox height={200} />
        <SkeletonBox height={200} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-lg">
        <ErrorBanner message={loadError} />
        <Link href="/routines">
          <Button variant="outline" size="md">
            Volver a rutinas
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Detección de "no encontrado" ─────────────────────────────────────────

  if (mode !== "create-own" && !routine && !loading) {
    return (
      <div className="flex flex-col gap-lg items-start">
        <p className="text-base text-fg-secondary m-0">Esta rutina no existe o fue eliminada.</p>
        <Link href="/routines">
          <Button variant="outline" size="md">
            Volver a rutinas
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const showSidePanel = mode === "edit-own";

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Banner read-only */}
      {isReadOnly && (
        <div
          className="flex items-center gap-sm p-md rounded-md mb-xl"
          style={{
            background: "var(--warning-alpha-20)",
            border: "1px solid var(--warning-alpha-40)",
            color: "var(--warning)",
          }}
        >
          <Lock size={16} className="flex-shrink-0" />
          <span className="text-sm font-medium">
            Esta rutina fue creada por el alumno o por otro coach. Solo podés verla — no editarla.
          </span>
        </div>
      )}

      <div
        className="flex gap-xxl"
        style={showSidePanel ? { alignItems: "flex-start" } : undefined}
      >
        {/* ─── Columna principal ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-lg flex-1 min-w-0">

          {/* Header: nombre + descripción + acciones */}
          <div className="flex flex-col gap-sm">
            <div className="flex items-start gap-lg flex-wrap">
              <div className="flex flex-col gap-xs flex-1 min-w-0">
                {/* Nombre inline */}
                <input
                  {...register("title")}
                  disabled={isReadOnly}
                  placeholder="Nombre de la rutina..."
                  className={[
                    "w-full bg-transparent text-fg placeholder-fg-tertiary outline-none transition-colors",
                    "text-display font-bold border-b-2",
                    errors.title
                      ? "border-destructive"
                      : "border-transparent focus:border-primary",
                    isReadOnly ? "cursor-default" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ lineHeight: 1.2, padding: "2px 0" }}
                />
                {errors.title && (
                  <p className="text-xxs text-destructive m-0">{errors.title.message}</p>
                )}

                {/* Descripción inline */}
                <input
                  {...register("description")}
                  disabled={isReadOnly}
                  placeholder="Descripción opcional..."
                  className={[
                    "w-full bg-transparent text-fg-secondary placeholder-fg-tertiary outline-none transition-colors",
                    "text-base border-b",
                    "border-transparent focus:border-primary",
                    isReadOnly ? "cursor-default" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ padding: "2px 0" }}
                />
              </div>

              {/* Botones de acción */}
              {!isReadOnly && (
                <div className="flex items-center gap-sm flex-shrink-0 flex-wrap">
                  {(mode === "edit-own" || mode === "edit-coach") && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleDuplicate}
                      loading={saving}
                      iconLeft={<Copy size={14} />}
                    >
                      Duplicar
                    </Button>
                  )}
                  {mode === "edit-own" && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      iconLeft={<Trash2 size={14} />}
                    >
                      Eliminar
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant={savedSuccess ? "success" : "primary"}
                    size="sm"
                    loading={saving}
                    iconLeft={<Save size={14} />}
                  >
                    {savedSuccess ? "¡Guardado!" : "Guardar"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Banner error de guardado */}
          {saveError && (
            <ErrorBanner message={saveError} dismissible />
          )}

          {/* Días de entrenamiento */}
          <Card>
            <h3 className="text-base font-semibold text-fg m-0 mb-md">
              Días de entrenamiento
            </h3>
            <div className="flex gap-sm flex-wrap">
              {ALL_DAYS.map(({ key, dow, label }) => {
                const active = selectedDays.includes(dow);
                return (
                  <button
                    key={dow}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleToggleDay(dow)}
                    className="transition-opacity"
                    style={{ opacity: isReadOnly ? 0.6 : 1, cursor: isReadOnly ? "default" : "pointer" }}
                  >
                    <DayBadge day={key}>
                      <span
                        style={
                          !active
                            ? {
                                background: "var(--fill-tertiary)",
                                color: "var(--fg-tertiary)",
                              }
                            : undefined
                        }
                      >
                        {label}
                      </span>
                    </DayBadge>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Lista de ejercicios */}
          <div className="flex flex-col gap-md">
            {blocks.map((block, idx) => (
              <ExerciseBlock
                key={block._key}
                data={block}
                index={idx}
                totalCount={blocks.length}
                readOnly={isReadOnly}
                onUpdate={handleUpdateBlock}
                onRemove={handleRemoveBlock}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}

            {blocks.length === 0 && !isReadOnly && (
              <div
                className="rounded-lg p-xxl flex flex-col items-center gap-md text-center"
                style={{
                  background: "var(--fill-tertiary)",
                  border: "1.5px dashed var(--separator)",
                }}
              >
                <p className="text-base text-fg-secondary m-0">
                  Esta rutina no tiene ejercicios todavía.
                </p>
                <p className="text-sm text-fg-tertiary m-0">
                  Hacé clic en "Agregar ejercicio" para empezar.
                </p>
              </div>
            )}
          </div>

          {/* Botón agregar ejercicio */}
          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => setShowExercisePicker(true)}
              iconLeft={<Plus size={16} />}
            >
              Agregar ejercicio
            </Button>
          )}
        </div>

        {/* ─── Side panel (solo edit-own) ─────────────────────────────────── */}
        {showSidePanel && (
          <aside
            className="flex flex-col gap-lg flex-shrink-0"
            style={{ width: "300px" }}
          >
            {/* Card: Asignada a */}
            <Card>
              <h3 className="text-base font-semibold text-fg m-0 mb-md">Asignada a</h3>
              {/* TODO: No hay endpoint para listar alumnos asignados a una rutina específica.
                   El backend expone RoutineShare en routine.shares — se usa eso. */}
              {routine && (routine.shares ?? []).filter((s) => s.status === "active").length > 0 ? (
                <div className="flex flex-col gap-xs mb-md">
                  {(routine.shares ?? [])
                    .filter((s) => s.status === "active")
                    .map((share) => (
                      <div key={share.id} className="flex items-center gap-sm">
                        <Avatar
                          src={share.sharedWith?.avatar_url ?? null}
                          initials={share.sharedWith?.username?.slice(0, 2).toUpperCase() ?? "?"}
                          size="sm"
                        />
                        <span className="text-sm text-fg">
                          {share.sharedWith?.username ?? "Alumno"}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-fg-tertiary m-0 mb-md">
                  Ningún alumno tiene esta rutina asignada.
                </p>
              )}
              {/* TODO: Botón "Asignar a alumno" — requiere endpoint POST /api/routines/:id/shares
                   o equivalente. No está documentado en PLANNING.md para esta wave. */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled
                title="Próximamente"
              >
                <Plus size={14} />
                Asignar a alumno
              </Button>
              <p className="text-xs text-fg-tertiary m-0 mt-xs text-center">
                Disponible próximamente
              </p>
            </Card>

            {/* Card: Detalles */}
            <Card>
              <h3 className="text-base font-semibold text-fg m-0 mb-md">Detalles</h3>
              <dl className="m-0 flex flex-col gap-sm">
                <DetailRow label="Creada" value={routine?.createdAt ? formatDate(routine.createdAt) : "—"} />
                <DetailRow label="Última edición" value={routine?.updated_at ? formatDate(routine.updated_at) : "—"} />
                <DetailRow label="Total ejercicios" value={String(blocks.length)} />
                <DetailRow
                  label="Duración estimada"
                  value={blocks.length > 0 ? `~${blocks.length * 8} min` : "—"}
                />
              </dl>
            </Card>
          </aside>
        )}
      </div>

      {/* Modals */}
      <ExercisePickerModal
        open={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={handleSelectExercise}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Eliminar rutina"
        description={`¿Seguro que querés eliminar "${routine?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </form>
  );
};

// ─── Sub-componente auxiliar ──────────────────────────────────────────────────

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-md text-sm">
    <dt className="text-fg-secondary m-0">{label}</dt>
    <dd className="text-fg m-0 font-medium text-right">{value}</dd>
  </div>
);

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
