"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Trash2, Save, Plus, Lock, Users, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SkeletonBox } from "@/components/ui/Skeleton";

import { ExerciseBlock, ExerciseBlockData, routineExerciseToBlock, groupVariants } from "./ExerciseBlock";
import { editableToRoutineSet } from "./SetsTable";
import { AssignRoutineModal } from "@/components/coaching/AssignRoutineModal";

import { getRoutine, createRoutine, updateRoutine, deleteRoutine } from "@/lib/api/routines";
import { getStudentRoutine, updateStudentRoutine } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { resolveVariablesConfig, getPresetVariablesConfig, buildEmptySet } from "@/lib/exercise-presets";
import type { Routine, DayOfWeek, ExerciseType, RoutineExerciseSet, VariablesConfig } from "@/lib/api/types";

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

const ALL_DAYS: {
  key: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  dow: DayOfWeek;
  label: string;
}[] = [
  { key: "mon", dow: "monday", label: "Lun" },
  { key: "tue", dow: "tuesday", label: "Mar" },
  { key: "wed", dow: "wednesday", label: "Mié" },
  { key: "thu", dow: "thursday", label: "Jue" },
  { key: "fri", dow: "friday", label: "Vie" },
  { key: "sat", dow: "saturday", label: "Sáb" },
  { key: "sun", dow: "sunday", label: "Dom" },
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
    variant_order: number;
    sets_data: RoutineExerciseSet[];
    variables_config?: VariablesConfig;
  }>;
}

/**
 * buildRoutinePayload — construye el payload para el backend.
 *
 * Agrupa los bloques por order_index (grupos de variantes), asigna
 * order_index secuencial 0,1,2… por grupo y variant_order 0,1,2… dentro del
 * grupo (por posición ordenada de variant_order actual).
 */
function buildRoutinePayload(
  values: FormValues,
  selectedDays: DayOfWeek[],
  blocks: ExerciseBlockData[],
): RoutinePayload {
  const groups = groupVariants(blocks);

  const exercises: RoutinePayload["exercises"] = [];

  groups.forEach((group, groupIdx) => {
    group.variants.forEach((block, variantIdx) => {
      const config = resolveVariablesConfig(block.variables_config, block.exercise_type);
      const sets_data = block.sets.map((s) => editableToRoutineSet(s, config));
      exercises.push({
        exercise_id: block.exercise_id ?? null,
        name: block.name,
        series: block.sets.length,
        repetitions: 0,
        exercise_type: block.exercise_type,
        is_warmup: block.is_warmup,
        order_index: groupIdx,
        variant_order: variantIdx,
        sets_data,
        variables_config: config,
      });
    });
  });

  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    day_of_week: selectedDays,
    exercises,
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
export const RoutineEditor: React.FC<RoutineEditorProps> = ({ mode, routineId, studentId, initialSeed }) => {
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
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  // Lista plana de bloques (incluye variantes)
  const [blocks, setBlocks] = useState<ExerciseBlockData[]>([]);

  // Authorship para modo edit-coach
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Modal de asignación a alumno
  const [showAssignModal, setShowAssignModal] = useState(false);

  // ─── React Hook Form ──────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
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

        const days = r.day_of_week ? (Array.isArray(r.day_of_week) ? r.day_of_week : [r.day_of_week]) : [];
        setSelectedDays(days);

        // Ordenar por (order_index, variant_order) antes de mapear
        const loadedBlocks = (r.exercises ?? [])
          .sort((a, b) => {
            const oiDiff = (a.order_index ?? 0) - (b.order_index ?? 0);
            if (oiDiff !== 0) return oiDiff;
            return (a.variant_order ?? 0) - (b.variant_order ?? 0);
          })
          .map(routineExerciseToBlock);
        setBlocks(loadedBlocks);

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

  const handleUpdateBlock = useCallback((key: string, updated: Partial<ExerciseBlockData>) => {
    setBlocks((prev) => prev.map((b) => (b._key === key ? { ...b, ...updated } : b)));
  }, []);

  const handleRemoveBlock = useCallback((key: string) => {
    setBlocks((prev) => {
      const filtered = prev.filter((b) => b._key !== key);
      // Re-normalizar variant_order dentro de los grupos afectados
      const groups = groupVariants(filtered);
      const result: ExerciseBlockData[] = [];
      groups.forEach((group) => {
        group.variants.forEach((v, vIdx) => {
          result.push({ ...v, variant_order: vIdx });
        });
      });
      return result;
    });
  }, []);

  /**
   * Reordena el grupo (todas sus variantes) a la posición 1-based dada.
   * orderIndex = order_index actual del grupo; newGroupPosition = nueva posición 1-based.
   */
  const handleReorderGroup = useCallback((currentOrderIndex: number, newGroupPosition: number) => {
    setBlocks((prev) => {
      const groups = groupVariants(prev);
      const currentGroupIdx = groups.findIndex((g) => g.variants.some((v) => v.order_index === currentOrderIndex));
      if (currentGroupIdx < 0) return prev;

      const targetIdx = Math.min(Math.max(newGroupPosition - 1, 0), groups.length - 1);
      if (targetIdx === currentGroupIdx) return prev;

      // Mover grupo en el array de grupos
      const reordered = [...groups];
      const [moved] = reordered.splice(currentGroupIdx, 1);
      reordered.splice(targetIdx, 0, moved);

      // Aplanar y re-asignar order_index
      const result: ExerciseBlockData[] = [];
      reordered.forEach((group, gIdx) => {
        group.variants.forEach((v) => {
          result.push({ ...v, order_index: gIdx });
        });
      });
      return result;
    });
  }, []);

  // ── Creación de bloques sin nombre (el buscador inline vive en ExerciseBlock) ──

  const buildEmptyBlock = useCallback(
    (orderIndex: number, variantOrder: number, keyPrefix: string): ExerciseBlockData => {
      const exerciseType: ExerciseType = "weight";
      const config = getPresetVariablesConfig(exerciseType);
      const defaultSetRaw = buildEmptySet(config);
      const defaultSet: Record<string, string> = {};
      for (const [k, v] of Object.entries(defaultSetRaw)) {
        if (typeof v === "string") defaultSet[k] = v;
      }
      return {
        _key: `${keyPrefix}-${Date.now()}-${Math.random()}`,
        routine_exercise_id: null,
        exercise_id: null,
        name: "",
        exercise_type: exerciseType,
        is_warmup: false,
        variables_config: config,
        sets: [defaultSet as ExerciseBlockData["sets"][number]],
        order_index: orderIndex,
        variant_order: variantOrder,
      };
    },
    [],
  );

  const handleAddExercise = useCallback(() => {
    setBlocks((prev) => {
      // order_index único (máximo + 1) → garantiza un grupo nuevo, nunca un suplente.
      const nextOrder =
        prev.length > 0 ? Math.max(...prev.map((b) => b.order_index)) + 1 : 0;
      return [...prev, buildEmptyBlock(nextOrder, 0, "new")];
    });
  }, [buildEmptyBlock]);

  const handleAddVariant = useCallback(
    (orderIndex: number) => {
      setBlocks((prev) => {
        const groups = groupVariants(prev);
        const group = groups.find((g) => g.variants.some((v) => v.order_index === orderIndex));
        const maxVariantOrder = group ? Math.max(...group.variants.map((v) => v.variant_order)) + 1 : 1;
        return [...prev, buildEmptyBlock(orderIndex, maxVariantOrder, "new-variant")];
      });
    },
    [buildEmptyBlock],
  );

  const onSubmit = handleSubmit(async (values) => {
    if (isReadOnly) {
      setSaveError("No tenés permiso para editar esta rutina.");
      return;
    }

    if (mode === "edit-coach" && routine && user && routine.created_by !== user.id) {
      setSaveError("No tenés permiso para editar esta rutina (no sos el autor).");
      return;
    }

    const groups = groupVariants(blocks);
    if (groups.length === 0) {
      setSaveError("Agregá al menos un ejercicio antes de guardar.");
      return;
    }

    // Validar que no haya ejercicios sin nombre (buscador inline sin elegir)
    for (const block of blocks) {
      if (!block.name.trim()) {
        setSaveError("Hay un ejercicio sin elegir. Buscá un ejercicio o quitá el bloque vacío.");
        return;
      }
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
            setSaveError(`El ejercicio "${block.name}" (superset) tiene una serie sin alias. Completá el campo Alias.`);
            return;
          }
        }
      }
    }

    setSaveError(null);
    setSaving(true);

    try {
      const payload = buildRoutinePayload(values, selectedDays, blocks);
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

  const groups = groupVariants(blocks);
  const showStudentsSelect = mode === "create-own" || mode === "edit-own";
  const assignedCount = (routine?.shares ?? []).filter((s) => s.status === "active").length;

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

      <div className="flex flex-col gap-lg">
        {/* Barra superior: nombre + días + alumnos + acciones */}
        <div className="flex flex-col gap-sm">
          <div className="flex items-center gap-md flex-wrap">
            <input
              {...register("title")}
              disabled={isReadOnly}
              placeholder="Nombre de la rutina..."
              className="flex-1 min-w-[200px] h-11 rounded-pill px-lg bg-fill-tertiary text-fg placeholder-fg-tertiary text-base font-semibold border outline-none transition-colors focus:border-primary disabled:cursor-default"
              style={{
                borderColor: errors.title ? "var(--destructive)" : "transparent",
              }}
            />

            <MultiSelect
              options={ALL_DAYS.map((d) => ({ value: d.dow, label: d.label }))}
              selected={selectedDays}
              onChange={(vals) => setSelectedDays(ALL_DAYS.filter((d) => vals.includes(d.dow)).map((d) => d.dow))}
              placeholder="Días asignados"
              ariaLabel="Días asignados"
              disabled={isReadOnly}
            />

            {showStudentsSelect && (
              <button
                type="button"
                disabled={!routineId}
                onClick={() => routineId && setShowAssignModal(true)}
                title={!routineId ? "Guardá la rutina primero" : undefined}
                aria-label="Alumnos asignados"
                className="flex-shrink-0 h-11 inline-flex items-center gap-sm rounded-pill border px-lg text-sm bg-fill-tertiary hover:bg-fill-quaternary transition-colors duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: assignedCount > 0 ? "var(--primary)" : "transparent",
                }}
              >
                <Users size={15} className="text-fg-tertiary" />
                <span className={assignedCount > 0 ? "text-fg" : "text-fg-secondary"}>
                  {assignedCount > 0 ? `Alumnos asignados (${assignedCount})` : "Alumnos asignados"}
                </span>
                <ChevronDown size={14} className="text-fg-tertiary" />
              </button>
            )}

            {!isReadOnly && (
              <>
                {(mode === "edit-own" || mode === "edit-coach") && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleDuplicate}
                    loading={saving}
                    iconLeft={<Copy size={16} />}
                  >
                    Copiar
                  </Button>
                )}
                {mode === "edit-own" && (
                  <Button
                    type="button"
                    variant="danger"
                    size="md"
                    onClick={() => setShowDeleteConfirm(true)}
                    iconLeft={<Trash2 size={16} />}
                  >
                    Eliminar
                  </Button>
                )}
                <Button
                  type="submit"
                  variant={savedSuccess ? "success" : "primary"}
                  size="md"
                  loading={saving}
                  iconLeft={<Save size={16} />}
                >
                  {savedSuccess ? "¡Guardado!" : "Guardar"}
                </Button>
              </>
            )}
          </div>

          {errors.title && <p className="text-xxs text-destructive m-0">{errors.title.message}</p>}
        </div>

        {saveError && <ErrorBanner message={saveError} dismissible />}

        {/* Lista de ejercicios (por grupos de variantes) */}
        <div className="flex flex-col gap-lg">
          {groups.map((group, gIdx) => (
            <ExerciseBlock
              key={group.groupKey}
              variants={group.variants}
              groupIndex={gIdx}
              totalGroups={groups.length}
              readOnly={isReadOnly}
              onUpdate={handleUpdateBlock}
              onRemove={handleRemoveBlock}
              onReorderGroup={handleReorderGroup}
              onAddVariant={handleAddVariant}
            />
          ))}

          {/* Card de "agregar ejercicio" — placeholder punteado clickeable */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleAddExercise}
              className="w-full flex items-center justify-center gap-sm rounded-lg py-lg text-sm font-semibold transition-colors hover:bg-fill-tertiary"
              style={{
                border: "1.5px dashed var(--separator)",
                color: "var(--fg-secondary)",
                background: "transparent",
              }}
            >
              <Plus size={18} className="text-fg-tertiary" />
              {groups.length === 0 ? "Agregá tu primer ejercicio" : "Agregar ejercicio"}
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
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

      {showAssignModal && routine && routineId && (
        <AssignRoutineModal
          open={showAssignModal}
          routineId={routineId}
          routineTitle={routine.title}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            // No cerramos — el coach puede asignar a varios alumnos seguidos.
          }}
        />
      )}
    </form>
  );
};
