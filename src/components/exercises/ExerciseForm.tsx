"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings2, Flame } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { VariablesConfigModal } from "@/components/routines/VariablesConfigModal";
import {
  resolveVariablesConfig,
  matchesPreset,
  getPresetVariablesConfig,
} from "@/lib/exercise-presets";
import {
  getMuscleGroups,
  createExercise,
  updateExercise,
} from "@/lib/api/exercises";
import { httpFetch } from "@/lib/api/http";
import { getErrorMessage } from "@/lib/utils";
import type { ExerciseType, VariablesConfig } from "@/lib/api/types";
import type { MuscleGroup } from "@/lib/api/exercises";

// ─── Tipos extendidos (respuesta real del backend) ──────────────────────────

interface ExerciseDetail {
  id: number;
  name: string;
  description?: string | null;
  muscle_groups?: string[] | null;
  exercise_type?: ExerciseType | null;
  is_warmup?: boolean | null;
  variables_config?: VariablesConfig | null;
  is_custom?: boolean;
  created_by?: number | null;
}

// ─── Zod schema ─────────────────────────────────────────────────────────────

const VALID_TYPES = ["weight", "timed", "superset", "custom"] as const;

const exerciseSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(150, "Máximo 150 caracteres"),
  description: z.string().trim().max(2000, "Máximo 2000 caracteres").optional().or(z.literal("")),
  exercise_type: z.enum(VALID_TYPES, {
    errorMap: () => ({ message: "Tipo inválido" }),
  }),
  muscle_groups: z
    .array(z.string())
    .max(3, "Máximo 3 grupos musculares"),
  is_warmup: z.boolean(),
});

type ExerciseFormValues = z.infer<typeof exerciseSchema>;

// ─── Etiquetas de tipo ───────────────────────────────────────────────────────

type ValidExerciseType = typeof VALID_TYPES[number];

const TYPE_OPTIONS: { value: ValidExerciseType; label: string; desc: string }[] = [
  { value: "weight", label: "Peso", desc: "Reps + peso + RIR" },
  { value: "timed", label: "Tiempo", desc: "Segundos" },
  { value: "superset", label: "Superset", desc: "Series con alias A/B" },
  { value: "custom", label: "Custom", desc: "Variables personalizadas" },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface ExerciseFormProps {
  mode: "create" | "edit";
  exerciseId?: number;
}

// ─── Componente ─────────────────────────────────────────────────────────────

/**
 * ExerciseForm — formulario compartido para crear y editar ejercicios custom.
 * - react-hook-form + zod
 * - Integra VariablesConfigModal para personalizar variables
 * - Auto-flip a "custom" si las variables no coinciden con el preset
 */
export const ExerciseForm: React.FC<ExerciseFormProps> = ({ mode, exerciseId }) => {
  const router = useRouter();

  // Estado de la página
  const [loadingExercise, setLoadingExercise] = useState(mode === "edit");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Variables config — se gestiona fuera de react-hook-form por complejidad
  const [variablesConfig, setVariablesConfig] = useState<VariablesConfig>(
    getPresetVariablesConfig("weight")
  );
  const [showVarsModal, setShowVarsModal] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      description: "",
      exercise_type: "weight",
      muscle_groups: [],
      is_warmup: false,
    },
  });

  const exerciseType = watch("exercise_type");

  // Cargar grupos musculares
  useEffect(() => {
    getMuscleGroups()
      .then((groups) => setMuscleGroups(groups))
      .catch(() => setMuscleGroups([]))
      .finally(() => setLoadingGroups(false));
  }, []);

  // Cargar ejercicio en modo edit
  useEffect(() => {
    if (mode !== "edit" || !exerciseId) return;

    setLoadingExercise(true);
    httpFetch<ExerciseDetail>(`/exercises/${exerciseId}`)
      .then((ex) => {
        const rawType = ex.exercise_type ?? "weight";
        const resolvedType = (VALID_TYPES as readonly string[]).includes(rawType)
          ? (rawType as typeof VALID_TYPES[number])
          : ("weight" as const);
        reset({
          name: ex.name ?? "",
          description: ex.description ?? "",
          exercise_type: resolvedType,
          muscle_groups: ex.muscle_groups ?? [],
          is_warmup: ex.is_warmup ?? false,
        });
        const resolved = resolveVariablesConfig(ex.variables_config, ex.exercise_type ?? "weight");
        setVariablesConfig(resolved);
      })
      .catch((err) => {
        const msg = err?.message ?? "";
        if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
          setNotFound(true);
        } else {
          setSubmitError(getErrorMessage(err, "No se pudo cargar el ejercicio."));
        }
      })
      .finally(() => setLoadingExercise(false));
  }, [mode, exerciseId, reset]);

  // Cuando cambia el tipo, ajustar variables al preset (si no es custom y no hay config custom)
  const handleTypeChange = (newType: typeof VALID_TYPES[number]) => {
    setValue("exercise_type", newType);
    if (newType !== "custom") {
      try {
        setVariablesConfig(getPresetVariablesConfig(newType));
      } catch {
        // "custom" no tiene preset — se ignora
      }
    }
  };

  // Al guardar variables del modal, auto-flip a custom si no coincide con el preset
  const handleVarsSave = (config: VariablesConfig) => {
    setVariablesConfig(config);
    const currentType = watch("exercise_type") as ValidExerciseType;
    if (currentType !== "custom" && !matchesPreset(config, currentType)) {
      setValue("exercise_type", "custom");
    }
  };

  const onSubmit = async (data: ExerciseFormValues) => {
    setSubmitError(null);

    const payload: Record<string, unknown> = {
      name: data.name,
      description: data.description || null,
      exercise_type: data.exercise_type,
      muscle_groups: data.muscle_groups,
      is_warmup: data.is_warmup,
      // Solo enviar variables_config si es custom o no coincide con el preset
      variables_config:
        data.exercise_type === "custom" || !matchesPreset(variablesConfig, data.exercise_type)
          ? variablesConfig
          : null,
    };

    try {
      if (mode === "create") {
        await createExercise(payload as Parameters<typeof createExercise>[0]);
      } else if (mode === "edit" && exerciseId) {
        await updateExercise(exerciseId, payload as Parameters<typeof updateExercise>[1]);
      }
      router.push("/exercises");
    } catch (err) {
      setSubmitError(getErrorMessage(err, "No se pudo guardar el ejercicio. Intentá de nuevo."));
    }
  };

  // ─── 404 ────────────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-lg py-xxxl">
        <p className="text-base text-fg-secondary">Ejercicio no encontrado.</p>
        <Button variant="secondary" onClick={() => router.push("/exercises")}>
          Volver a ejercicios
        </Button>
      </div>
    );
  }

  // ─── Loading skeleton ────────────────────────────────────────────────────────

  if (loadingExercise) {
    return (
      <div className="flex flex-col gap-xl max-w-2xl">
        <SkeletonLine width="40%" height={18} />
        <SkeletonLine width="100%" height={44} />
        <SkeletonLine width="100%" height={80} />
        <div className="flex gap-sm">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLine key={i} width={80} height={36} />
          ))}
        </div>
        <SkeletonLine width="60%" height={36} />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const varLabels = variablesConfig.variables.map((v) => v.label ?? v.key).join(", ");

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-xl max-w-2xl">
      {submitError && (
        <ErrorBanner message={submitError} dismissible />
      )}

      {/* Nombre */}
      <Field
        label="Nombre del ejercicio *"
        error={errors.name?.message}
        inputProps={{
          ...register("name"),
          placeholder: "Ej: Sentadilla con barra",
          maxLength: 150,
          autoComplete: "off",
        }}
      />

      {/* Descripción */}
      <div className="flex flex-col gap-xs">
        <label className="text-sm font-medium text-fg-secondary">
          Descripción (opcional)
        </label>
        <textarea
          {...register("description")}
          placeholder="Descripción, notas de ejecución..."
          maxLength={2000}
          rows={3}
          className={[
            "w-full bg-fill-tertiary text-fg placeholder-fg-tertiary",
            "border border-transparent rounded-md px-md py-md",
            "text-base outline-none resize-y",
            "transition-colors duration-150",
            "focus:border-primary focus:bg-fill-quaternary",
            errors.description ? "border-destructive" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
        {errors.description && (
          <p className="text-xxs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Tipo de ejercicio */}
      <div className="flex flex-col gap-sm">
        <label className="text-sm font-medium text-fg-secondary">
          Tipo de ejercicio
        </label>
        <div className="flex flex-wrap gap-sm">
          {TYPE_OPTIONS.map((opt) => {
            const isSelected = exerciseType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleTypeChange(opt.value)}
                className={[
                  "flex flex-col items-start px-md py-sm rounded-md border transition-colors",
                  "text-left cursor-pointer",
                  isSelected
                    ? "border-primary"
                    : "border-transparent hover:border-separator",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  background: isSelected ? "var(--primary-alpha-12)" : "var(--fill-tertiary)",
                  minWidth: "100px",
                }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: isSelected ? "var(--primary)" : "var(--fg)" }}
                >
                  {opt.label}
                </span>
                <span className="text-xs" style={{ color: "var(--fg-secondary)" }}>
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
        {errors.exercise_type && (
          <p className="text-xxs text-destructive">{errors.exercise_type.message}</p>
        )}
      </div>

      {/* Grupos musculares */}
      <div className="flex flex-col gap-sm">
        <label className="text-sm font-medium text-fg-secondary">
          Grupos musculares (máx. 3)
        </label>
        {loadingGroups ? (
          <div className="flex gap-xs flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonLine key={i} width={80} height={28} />
            ))}
          </div>
        ) : (
          <Controller
            name="muscle_groups"
            control={control}
            render={({ field }) => {
              const selected = field.value ?? [];
              const toggle = (name: string) => {
                if (selected.includes(name)) {
                  field.onChange(selected.filter((s) => s !== name));
                } else if (selected.length < 3) {
                  field.onChange([...selected, name]);
                }
              };
              return (
                <div className="flex flex-wrap gap-xs">
                  {muscleGroups.map((mg) => {
                    const isSelected = selected.includes(mg.name);
                    const isDisabled = !isSelected && selected.length >= 3;
                    return (
                      <button
                        key={mg.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggle(mg.name)}
                        className={[
                          "px-md py-xs rounded-pill text-sm font-medium border transition-colors",
                          isDisabled
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={
                          isSelected
                            ? {
                                background: "var(--primary-alpha-12)",
                                borderColor: "var(--primary)",
                                color: "var(--primary)",
                              }
                            : {
                                background: "var(--fill-tertiary)",
                                borderColor: "transparent",
                                color: "var(--fg-secondary)",
                              }
                        }
                      >
                        {mg.name}
                      </button>
                    );
                  })}
                </div>
              );
            }}
          />
        )}
        {errors.muscle_groups && (
          <p className="text-xxs text-destructive">{errors.muscle_groups.message}</p>
        )}
      </div>

      {/* Variables config */}
      <div className="flex flex-col gap-sm">
        <label className="text-sm font-medium text-fg-secondary">
          Variables de tracking
        </label>
        <div className="flex items-center gap-sm flex-wrap">
          <div
            className="flex items-center gap-sm px-md py-sm rounded-md flex-1 min-w-0"
            style={{ background: "var(--fill-tertiary)" }}
          >
            <span className="text-sm text-fg-secondary truncate">
              {varLabels || "Sin variables configuradas"}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            iconLeft={<Settings2 size={14} />}
            onClick={() => setShowVarsModal(true)}
          >
            Configurar
          </Button>
        </div>
        {exerciseType === "custom" && variablesConfig.variables.length === 0 && (
          <p className="text-xxs text-warning">
            El tipo "Custom" requiere al menos 1 variable. Configurá las variables.
          </p>
        )}
      </div>

      {/* Is warmup */}
      <Controller
        name="is_warmup"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-md">
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className="relative inline-flex h-6 w-11 items-center rounded-pill transition-colors duration-200 flex-shrink-0"
              style={{
                background: field.value ? "var(--primary)" : "var(--fill-secondary)",
              }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-pill bg-white shadow transition-transform duration-200"
                style={{
                  transform: field.value ? "translateX(22px)" : "translateX(4px)",
                }}
              />
            </button>
            <div className="flex flex-col gap-xxs">
              <span className="text-sm font-medium text-fg flex items-center gap-xs">
                <Flame size={14} style={{ color: "var(--warning)" }} />
                Es calentamiento
              </span>
              <span className="text-xs text-fg-secondary">
                Solo etiqueta visual — no cambia las variables de tracking.
              </span>
            </div>
          </div>
        )}
      />

      {/* Footer */}
      <div
        className="flex gap-sm pt-sm"
        style={{ borderTop: "1px solid var(--separator-subtle)" }}
      >
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSubmitting}
          className="flex-1"
        >
          {mode === "create" ? "Crear ejercicio" : "Guardar cambios"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={isSubmitting}
          onClick={() => router.push("/exercises")}
        >
          Cancelar
        </Button>
      </div>

      {/* Modal de variables */}
      <VariablesConfigModal
        open={showVarsModal}
        onClose={() => setShowVarsModal(false)}
        currentConfig={variablesConfig}
        onSave={handleVarsSave}
      />
    </form>
  );
};
