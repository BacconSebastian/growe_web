"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import type { TemplateSourceType, TemplateDifficulty } from "@/lib/api/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const templateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio.").max(120, "Máximo 120 caracteres."),
  description: z.string().max(500, "Máximo 500 caracteres.").optional(),
  category: z.string().max(60, "Máximo 60 caracteres.").optional(),
  source_type: z.enum(["routine", "planning"] as const),
  source_id: z
    .string()
    .min(1, "El ID es obligatorio.")
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n > 0;
    }, "Debe ser un número entero positivo."),
  difficulty_level: z
    .enum(["beginner", "intermediate", "advanced"] as const)
    .optional()
    .or(z.literal("")),
});

export type TemplateFormValues = z.infer<typeof templateSchema>;

// ─── Opciones ─────────────────────────────────────────────────────────────────

const SOURCE_TYPES: Array<{ value: TemplateSourceType; label: string }> = [
  { value: "routine", label: "Rutina" },
  { value: "planning", label: "Planificación" },
];

const DIFFICULTY_OPTIONS: Array<{ value: TemplateDifficulty; label: string }> = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

// ─── Componente ───────────────────────────────────────────────────────────────

interface TemplateFormProps {
  onSubmit: (values: TemplateFormValues) => Promise<void>;
  saving: boolean;
  error: string | null;
}

/**
 * TemplateForm — formulario de creación de template.
 * Replica los campos del mobile/app/coaching/templates/new.tsx
 * usando react-hook-form + zod según la convención del proyecto web.
 */
export const TemplateForm: React.FC<TemplateFormProps> = ({
  onSubmit,
  saving,
  error,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      source_type: "routine",
      source_id: "",
      difficulty_level: "",
    },
  });

  const sourceType = watch("source_type");
  const difficultyLevel = watch("difficulty_level");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-xl">
      {error && <ErrorBanner message={error} />}

      {/* Nombre */}
      <Field
        label="Nombre *"
        error={errors.name?.message}
        inputProps={{
          ...register("name"),
          placeholder: "Ej: Full Body Principiante",
          autoFocus: true,
          disabled: saving,
        }}
      />

      {/* Descripción */}
      <div className="flex flex-col gap-xs">
        <label className="text-sm font-medium text-fg-secondary">
          Descripción
        </label>
        <textarea
          {...register("description")}
          placeholder="Descripción opcional del template"
          rows={3}
          disabled={saving}
          className={[
            "w-full bg-fill-tertiary text-fg placeholder-fg-tertiary",
            "border border-transparent rounded-md px-md py-sm",
            "text-base outline-none resize-none",
            "transition-colors duration-150",
            "focus:border-primary focus:bg-fill-quaternary",
            "disabled:opacity-50",
            errors.description ? "border-destructive focus:border-destructive" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
        {errors.description && (
          <p className="text-xxs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Tipo de fuente — segmento */}
      <div className="flex flex-col gap-sm">
        <label className="text-sm font-medium text-fg-secondary">
          Tipo de fuente
        </label>
        <div className="flex gap-sm">
          {SOURCE_TYPES.map((opt) => {
            const isActive = sourceType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => setValue("source_type", opt.value)}
                className={[
                  "flex-1 h-10 rounded-md text-sm font-medium",
                  "border transition-colors duration-150",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isActive
                    ? "bg-primary text-on-primary border-primary"
                    : "text-fg-secondary border-separator hover:text-fg",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  !isActive
                    ? {
                        background:
                          "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                      }
                    : undefined
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ID de la fuente */}
      <div className="flex flex-col gap-xs">
        <Field
          label={`ID de ${sourceType === "routine" ? "la rutina" : "la planificación"} *`}
          error={errors.source_id?.message}
          inputProps={{
            ...register("source_id"),
            type: "number",
            placeholder: "Ej: 123",
            min: 1,
            disabled: saving,
          }}
        />
        <p className="text-xs text-fg-tertiary m-0">
          Podés obtener este ID desde la pantalla de edición de{" "}
          {sourceType === "routine" ? "la rutina" : "la planificación"}.
        </p>
      </div>

      {/* Categoría */}
      <Field
        label="Categoría"
        error={errors.category?.message}
        inputProps={{
          ...register("category"),
          placeholder: "Ej: Fuerza, Cardio, Movilidad",
          disabled: saving,
        }}
      />

      {/* Dificultad — segmento toggleable */}
      <div className="flex flex-col gap-sm">
        <label className="text-sm font-medium text-fg-secondary">
          Dificultad
        </label>
        <div className="flex gap-sm">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const isActive = difficultyLevel === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() =>
                  setValue("difficulty_level", isActive ? "" : opt.value)
                }
                className={[
                  "flex-1 h-10 rounded-md text-sm font-medium",
                  "border transition-colors duration-150",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isActive
                    ? "bg-primary text-on-primary border-primary"
                    : "text-fg-secondary border-separator hover:text-fg",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  !isActive
                    ? {
                        background:
                          "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                      }
                    : undefined
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={saving}
        className="w-full mt-sm"
      >
        Crear template
      </Button>
    </form>
  );
};
