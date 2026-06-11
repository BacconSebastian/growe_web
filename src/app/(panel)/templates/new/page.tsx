"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TemplateForm } from "@/components/templates/TemplateForm";
import type { TemplateFormValues } from "@/components/templates/TemplateForm";
import { createCoachTemplate } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";

/**
 * /templates/new — Crear nuevo template de coaching.
 * Espejo web de mobile/app/coaching/templates/new.tsx.
 */
export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: TemplateFormValues) => {
    setSaving(true);
    setError(null);
    try {
      await createCoachTemplate({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        category: values.category?.trim() || undefined,
        source_type: values.source_type,
        source_id: Number(values.source_id),
        difficulty_level: values.difficulty_level || undefined,
      });
      router.push("/templates");
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo crear el template."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-xxl" style={{ maxWidth: "640px" }}>
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-md">
        <Link href="/templates">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />}>
            Templates
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1
          className="text-display font-bold tracking-tight m-0"
          style={{ letterSpacing: "-0.4px" }}
        >
          Nuevo template
        </h1>
        <p className="text-base text-fg-secondary mt-xs m-0">
          Creá un template desde una rutina o planificación existente para
          reutilizarlo con tus alumnos.
        </p>
      </div>

      {/* Formulario */}
      <TemplateForm onSubmit={handleSubmit} saving={saving} error={error} />
    </div>
  );
}
