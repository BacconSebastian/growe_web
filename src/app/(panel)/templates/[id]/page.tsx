"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarDays, Dumbbell, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApplyTemplateModal } from "@/components/templates/ApplyTemplateModal";
import { getCoachTemplate, deleteCoachTemplate } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import type { CoachTemplate, TemplateDifficulty } from "@/lib/api/types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS: Record<TemplateDifficulty, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

const DIFFICULTY_BADGE_VARIANT: Record<
  TemplateDifficulty,
  "success" | "warning" | "danger"
> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "danger",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TemplateSkeleton() {
  return (
    <div className="flex flex-col gap-xl" style={{ maxWidth: "720px" }}>
      <SkeletonBox height={32} />
      <SkeletonBox height={120} />
      <SkeletonBox height={48} />
      <SkeletonBox height={200} />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

/**
 * /templates/[id] — Detalle de un template: metadatos, estructura,
 * borrar y "Aplicar a alumnos" con selector multi-alumno.
 *
 * Espejo web de mobile/app/coaching/templates/[templateId].tsx.
 */
export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const templateId = Number(params.id);
  const router = useRouter();

  const [template, setTemplate] = useState<CoachTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applySuccess, setApplySuccess] = useState<number | null>(null);

  const fetchTemplate = useCallback(async () => {
    if (!Number.isFinite(templateId) || templateId <= 0) {
      setError("ID de template inválido.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCoachTemplate(templateId);
      setTemplate(data);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el template."));
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCoachTemplate(templateId);
      router.push("/templates");
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar el template."));
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleApplySuccess = (appliedTo: number[]) => {
    setApplySuccess(appliedTo.length);
    // Limpiar feedback tras 4 segundos
    setTimeout(() => setApplySuccess(null), 4000);
  };

  // ─── Estados de carga / error ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-xxl">
        <div className="flex items-center gap-md">
          <Link href="/templates">
            <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />}>
              Templates
            </Button>
          </Link>
        </div>
        <TemplateSkeleton />
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="flex flex-col gap-xxl" style={{ maxWidth: "720px" }}>
        <Link href="/templates">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />}>
            Templates
          </Button>
        </Link>
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!template) return null;

  const isPlanning = template.type === "coach_planning";
  const routines = template.program_data?.routines ?? [];
  const weekCount = template.program_data?.weeks;

  return (
    <>
      <div className="flex flex-col gap-xxl" style={{ maxWidth: "720px" }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-md">
          <Link href="/templates">
            <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />}>
              Templates
            </Button>
          </Link>
        </div>

        {/* Error inline (p. ej. fallo de borrado) */}
        {error && <ErrorBanner message={error} dismissible />}

        {/* Feedback de aplicación exitosa */}
        {applySuccess !== null && (
          <div
            className="flex items-center gap-md p-lg rounded-md"
            style={{
              background: "var(--success-alpha-12)",
              border: "1px solid var(--success-alpha-20)",
              color: "var(--success)",
            }}
          >
            <Users size={16} className="flex-shrink-0" />
            <span className="text-sm font-medium">
              Template aplicado a {applySuccess}{" "}
              {applySuccess === 1 ? "alumno" : "alumnos"} correctamente.
            </span>
          </div>
        )}

        {/* Card de info principal */}
        <Card variant="default">
          <div className="flex flex-col gap-lg">
            {/* Header: ícono + nombre + acciones */}
            <div className="flex items-start gap-md">
              <div
                className="w-12 h-12 rounded-pill flex items-center justify-center flex-shrink-0"
                style={{
                  background: "var(--primary-alpha-12)",
                  color: "var(--primary)",
                }}
              >
                {isPlanning ? <CalendarDays size={22} /> : <BookOpen size={22} />}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-fg m-0 leading-tight break-words">
                  {template.name}
                </h1>
              </div>

              {/* Botón eliminar */}
              <Button
                variant="danger"
                size="sm"
                iconLeft={<Trash2 size={14} />}
                onClick={() => setDeleteDialogOpen(true)}
                className="flex-shrink-0"
              >
                Eliminar
              </Button>
            </div>

            {/* Descripción */}
            {template.description && (
              <p className="text-base text-fg-secondary m-0 leading-relaxed">
                {template.description}
              </p>
            )}

            {/* Pills de metadatos */}
            <div className="flex flex-wrap gap-sm">
              <Badge variant="primary" size="md">
                {isPlanning ? "Planificación" : "Rutina"}
              </Badge>

              {template.category && (
                <Badge variant="neutral" size="md">
                  {template.category}
                </Badge>
              )}

              {template.difficulty_level && (
                <Badge
                  variant={DIFFICULTY_BADGE_VARIANT[template.difficulty_level]}
                  size="md"
                >
                  {DIFFICULTY_LABELS[template.difficulty_level]}
                </Badge>
              )}

              {isPlanning && weekCount != null && (
                <Badge variant="neutral" size="md">
                  {weekCount} {weekCount === 1 ? "semana" : "semanas"}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Estructura del template */}
        {routines.length > 0 && (
          <div className="flex flex-col gap-lg">
            <h2 className="text-lg font-semibold text-fg m-0">Contenido</h2>

            {routines.map((routine, routineIndex) => (
              <Card key={routineIndex} variant="flat">
                <div className="flex flex-col gap-md">
                  {/* Título de la rutina */}
                  <div className="flex items-center gap-sm">
                    <Dumbbell size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <h3 className="text-base font-semibold text-fg m-0">
                      {routine.title}
                    </h3>
                  </div>

                  {/* Lista de ejercicios */}
                  <div className="flex flex-col" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
                    {routine.exercises.map((ex, exIndex) => (
                      <div
                        key={exIndex}
                        className="flex items-center gap-sm py-sm"
                        style={{ borderBottom: "1px solid var(--separator-subtle)" }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: "var(--primary)" }}
                        />
                        <span className="flex-1 text-sm text-fg-secondary truncate">
                          {ex.name}
                        </span>
                        <span className="text-xs text-fg-tertiary whitespace-nowrap">
                          {ex.series}×{ex.repetitions}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* CTA — Aplicar a alumnos */}
        <Button
          variant="primary"
          size="lg"
          iconLeft={<Users size={16} />}
          onClick={() => setApplyModalOpen(true)}
          className="w-full"
        >
          Aplicar a alumnos
        </Button>
      </div>

      {/* Modal de selección de alumnos */}
      <ApplyTemplateModal
        open={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        templateId={templateId}
        templateName={template.name}
        onSuccess={handleApplySuccess}
      />

      {/* Confirm eliminar */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Eliminar template"
        description={`¿Eliminar "${template.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </>
  );
}
