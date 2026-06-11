"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Users, CheckCircle, Circle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { listStudents, applyCoachTemplate } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import type { StudentListItem } from "@/lib/api/coaching";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ApplyTemplateModalProps {
  open: boolean;
  onClose: () => void;
  templateId: number;
  templateName: string;
  onSuccess?: (appliedTo: number[]) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStudentDisplayName(student: StudentListItem): string {
  const parts: string[] = [];
  if (student.first_name) parts.push(student.first_name);
  if (student.last_name) parts.push(student.last_name);
  if (parts.length > 0) return parts.join(" ");
  return student.username;
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * ApplyTemplateModal — modal de selección de alumnos para aplicar un template.
 * Replica el modal del mobile/app/coaching/templates/[templateId].tsx.
 * Usa listStudents (web — no recibe accessToken) y applyCoachTemplate.
 */
export const ApplyTemplateModal: React.FC<ApplyTemplateModalProps> = ({
  open,
  onClose,
  templateId,
  templateName,
  onSuccess,
}) => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carga alumnos cuando el modal abre
  useEffect(() => {
    if (!open) return;
    setSelectedIds([]);
    setError(null);
    setStudentsLoading(true);

    listStudents({})
      .then((res) => setStudents(res.items))
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
  }, [open]);

  const toggleStudent = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const handleApply = async () => {
    if (selectedIds.length === 0) return;
    setApplying(true);
    setError(null);
    try {
      const res = await applyCoachTemplate(templateId, selectedIds);
      onClose();
      onSuccess?.(res.applied_to);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo aplicar el template."));
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal open={open} onClose={applying ? undefined! : onClose} title="Seleccionar alumnos" size="md">
      <div className="flex flex-col gap-xl">
        <p className="text-sm text-fg-secondary m-0">
          Aplicar <span className="font-semibold text-fg">"{templateName}"</span> a los alumnos seleccionados.
        </p>

        {/* Lista de alumnos */}
        <div
          className="flex flex-col rounded-md overflow-hidden"
          style={{ border: "1px solid var(--separator-subtle)", maxHeight: "320px", overflowY: "auto" }}
        >
          {studentsLoading ? (
            <div className="flex flex-col gap-sm p-lg">
              <SkeletonBox height={44} />
              <SkeletonBox height={44} />
              <SkeletonBox height={44} />
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-fg-secondary text-center p-xxl m-0">
              No tenés alumnos activos.
            </p>
          ) : (
            students.map((student) => {
              const selected = selectedIds.includes(student.id);
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  disabled={applying}
                  className={[
                    "flex items-center gap-md px-lg py-md text-left",
                    "transition-colors duration-100 disabled:opacity-50",
                    selected
                      ? "bg-primary-alpha-08"
                      : "hover:bg-fill-tertiary",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ borderBottom: "1px solid var(--separator-subtle)" }}
                >
                  {selected ? (
                    <CheckCircle size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  ) : (
                    <Circle size={18} style={{ color: "var(--fg-tertiary)", flexShrink: 0 }} />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-fg truncate">
                      {getStudentDisplayName(student)}
                    </span>
                    <span className="text-xs text-fg-tertiary">@{student.username}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Contador de seleccionados */}
        {selectedIds.length > 0 && (
          <p className="text-sm text-fg-secondary m-0">
            {selectedIds.length}{" "}
            {selectedIds.length === 1 ? "alumno seleccionado" : "alumnos seleccionados"}
          </p>
        )}

        {error && <ErrorBanner message={error} />}

        {/* Acciones */}
        <div className="flex flex-col gap-sm">
          <Button
            variant="primary"
            size="md"
            iconLeft={<Users size={16} />}
            loading={applying}
            disabled={selectedIds.length === 0 || applying}
            onClick={handleApply}
            className="w-full"
          >
            Aplicar template
          </Button>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={applying}
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
