"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

const groupSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(80, "Máximo 80 caracteres"),
  description: z
    .string()
    .max(200, "Máximo 200 caracteres")
    .optional(),
});

export type GroupFormValues = z.infer<typeof groupSchema>;

interface GroupFormProps {
  defaultValues?: Partial<GroupFormValues>;
  onSubmit: (values: GroupFormValues) => Promise<void>;
  submitLabel?: string;
  error?: string | null;
  /** Slot opcional debajo del form (ej: selector de alumnos) */
  extra?: React.ReactNode;
}

/**
 * GroupForm — formulario de creación/edición de un grupo de entrenamiento.
 * Usa react-hook-form + zod. El submit dispara onSubmit con loading manejado externamente.
 */
export const GroupForm: React.FC<GroupFormProps> = ({
  defaultValues,
  onSubmit,
  submitLabel = "Guardar",
  error,
  extra,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-xl">
      {error && <ErrorBanner message={error} />}

      {/* Nombre */}
      <div className="flex flex-col gap-sm">
        <label
          htmlFor="group-name"
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--fg-secondary)" }}
        >
          Nombre del grupo *
        </label>
        <input
          id="group-name"
          type="text"
          placeholder="Ej: Avanzados mañana"
          autoFocus
          {...register("name")}
          className={[
            "w-full h-11 px-md bg-fill-tertiary text-fg placeholder-fg-tertiary",
            "border rounded-md text-base outline-none transition-colors duration-150",
            "focus:border-primary focus:bg-fill-quaternary",
            errors.name
              ? "border-destructive"
              : "border-transparent",
          ]
            .filter(Boolean)
            .join(" ")}
        />
        {errors.name && (
          <span className="text-xs" style={{ color: "var(--destructive)" }}>
            {errors.name.message}
          </span>
        )}
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-sm">
        <label
          htmlFor="group-description"
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--fg-secondary)" }}
        >
          Descripción (opcional)
        </label>
        <textarea
          id="group-description"
          placeholder="Ej: Grupo de alumnos nivel avanzado"
          rows={3}
          {...register("description")}
          className={[
            "w-full px-md py-sm bg-fill-tertiary text-fg placeholder-fg-tertiary",
            "border rounded-md text-base outline-none transition-colors duration-150",
            "focus:border-primary focus:bg-fill-quaternary resize-none",
            errors.description
              ? "border-destructive"
              : "border-transparent",
          ]
            .filter(Boolean)
            .join(" ")}
        />
        {errors.description && (
          <span className="text-xs" style={{ color: "var(--destructive)" }}>
            {errors.description.message}
          </span>
        )}
      </div>

      {/* Slot extra (ej: selector de alumnos) */}
      {extra}

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={isSubmitting}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </form>
  );
};
