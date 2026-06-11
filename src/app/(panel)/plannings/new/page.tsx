"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Input } from "@/components/ui/Input";
import { createPlanning } from "@/lib/api/plannings";
import { getErrorMessage } from "@/lib/utils";

/**
 * /plannings/new — Crear nueva planificación del coach.
 *
 * Flujo: pedir título → crear planning → redirigir al PlanningOverview (modelo nuevo).
 * El usuario agrega semanas y rutinas desde el overview.
 */

const schema = z.object({
  title: z.string().min(1, "El nombre es requerido").max(120),
});

type FormValues = z.infer<typeof schema>;

export default function NewPlanningPage() {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setCreateError(null);
    try {
      const planning = await createPlanning({ title: values.title });
      router.push(`/plannings/${planning.id}`);
    } catch (err) {
      setCreateError(getErrorMessage(err, "No se pudo crear la planificación."));
    }
  };

  return (
    <div className="flex flex-col gap-xxl max-w-lg">
      <div className="flex flex-col gap-xs">
        <h1 className="text-2xl font-bold text-fg m-0">Nueva planificación</h1>
        <p className="text-sm text-fg-secondary m-0">
          Creá la planificación y luego agregá semanas y rutinas.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-xl"
        noValidate
      >
        {createError && <ErrorBanner message={createError} dismissible />}

        {/* Nombre */}
        <div className="flex flex-col gap-xs">
          <label className="text-sm font-semibold text-fg-secondary">
            Nombre *
          </label>
          <Input
            placeholder="Ej: Hypertrofia 12 semanas"
            {...register("title")}
            error={Boolean(errors.title)}
          />
          {errors.title && (
            <p className="text-xs text-destructive m-0">{errors.title.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-sm">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            className="w-full"
          >
            Crear planificación
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={isSubmitting}
            onClick={() => router.push("/plannings")}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
