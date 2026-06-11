"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonBox } from "@/components/ui/Skeleton";
import { assignGroupPlanning } from "@/lib/api/coaching";
import { listPlannings } from "@/lib/api/plannings";
import type { Planning } from "@/lib/api/types";
import type { AssignGroupPlanningResult } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/utils";

interface AssignPlanningModalProps {
  open: boolean;
  onClose: () => void;
  groupId: number;
  onAssigned: (results: AssignGroupPlanningResult[]) => void;
}

function PlanningSkeleton() {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: "1px solid var(--separator-subtle)" }}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-md px-lg py-md"
          style={{
            borderBottom: i < 3 ? "1px solid var(--separator-subtle)" : "none",
          }}
        >
          <SkeletonBox width={36} height={36} className="rounded-md flex-shrink-0" />
          <div className="flex flex-col gap-xs flex-1">
            <SkeletonLine width="60%" height={14} />
            <SkeletonLine width="30%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * AssignPlanningModal — selector de planning para asignar a un grupo.
 * Radio single-select, luego llama assignGroupPlanning.
 */
export const AssignPlanningModal: React.FC<AssignPlanningModalProps> = ({
  open,
  onClose,
  groupId,
  onAssigned,
}) => {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadPlannings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPlannings({ page: 1 });
      setPlannings(res.items);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las planificaciones"));
    } finally {
      setLoading(false);
    }
  }, []);

  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setSelectedId(null);
      setSubmitError(null);
      loadPlannings();
    }
    prevOpen.current = open;
  }, [open, loadPlannings]);

  const handleAssign = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await assignGroupPlanning(groupId, { planning_id: selectedId });
      onAssigned(res.results);
      onClose();
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Error al asignar la planificación"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Asignar planificación" size="sm" dismissable={!submitting}>
      <div className="flex flex-col gap-lg">
        {submitError && <ErrorBanner message={submitError} />}

        {loading ? (
          <PlanningSkeleton />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : plannings.length === 0 ? (
          <p className="text-sm text-fg-secondary text-center py-xl">
            No tenés planificaciones disponibles.
          </p>
        ) : (
          <div
            className="rounded-md overflow-hidden"
            style={{ border: "1px solid var(--separator-subtle)" }}
          >
            {plannings.map((planning, idx) => {
              const selected = selectedId === planning.id;
              const weekCount =
                (planning as Planning & { weeks?: unknown[] }).weeks?.length ??
                (planning as Planning & { total_weeks?: number }).total_weeks ??
                0;
              const isLast = idx === plannings.length - 1;

              return (
                <button
                  key={planning.id}
                  type="button"
                  onClick={() => setSelectedId(planning.id)}
                  className="w-full flex items-center gap-md px-lg py-md text-left transition-colors hover:bg-fill-quaternary"
                  style={{
                    borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)",
                    background: selected ? "var(--primary-alpha-08)" : "transparent",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--primary-alpha-12)" }}
                  >
                    <BookOpen size={16} style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium text-fg truncate">
                      {planning.title}
                    </span>
                    <span className="text-xs text-fg-tertiary">
                      {weekCount} {weekCount === 1 ? "semana" : "semanas"}
                    </span>
                  </div>
                  {/* Radio */}
                  <div
                    className="w-5 h-5 rounded-pill flex items-center justify-center flex-shrink-0"
                    style={{
                      border: selected
                        ? "2px solid var(--primary)"
                        : "2px solid var(--separator)",
                    }}
                  >
                    {selected && (
                      <div
                        className="w-2.5 h-2.5 rounded-pill"
                        style={{ background: "var(--primary)" }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col gap-sm pt-sm" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
          <Button
            variant="primary"
            size="md"
            loading={submitting}
            disabled={submitting || !selectedId}
            onClick={handleAssign}
            className="w-full"
          >
            Asignar al grupo
          </Button>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={submitting}
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
