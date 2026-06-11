"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, TrendingUp, Trash2, Pencil } from "lucide-react";
import {
  listProgressionRules,
  createProgressionRule,
  updateProgressionRule,
  deleteProgressionRule,
} from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SkeletonLine, SkeletonBox } from "@/components/ui/Skeleton";
import { ProgressionRuleForm } from "./ProgressionRuleForm";
import type {
  ProgressionRule,
  ProgressionConditionType,
  ProgressionActionType,
  CreateProgressionRuleData,
} from "@/lib/api/types";

// ─── Label maps ────────────────────────────────────────────────────────────

const CONDITION_LABELS: Record<ProgressionConditionType, string> = {
  rir_above: "RIR mayor a",
  completed_all_sets: "Completó todas las series",
  weight_threshold: "Peso mayor a",
};

const ACTION_LABELS: Record<ProgressionActionType, string> = {
  increase_weight_percent: "Aumentar peso %",
  increase_weight_fixed: "Aumentar peso fijo (kg)",
  increase_reps: "Aumentar repeticiones",
  increase_sets: "Aumentar series",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function describeCondition(rule: ProgressionRule): string {
  switch (rule.condition_type) {
    case "rir_above": {
      const val = (rule.condition_value as { rir?: number }).rir ?? "?";
      return `RIR > ${val}`;
    }
    case "completed_all_sets":
      return "Completó todas las series";
    case "weight_threshold": {
      const val =
        (rule.condition_value as { weight_kg?: number }).weight_kg ?? "?";
      return `Peso > ${val} kg`;
    }
    default:
      return "";
  }
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function RulesSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[1, 2, 3].map((i) => (
        <SkeletonBox key={i} height={96} />
      ))}
    </div>
  );
}

// ─── Fila de regla ─────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: ProgressionRule;
  togglingId: number | null;
  deletingId: number | null;
  onToggle: (rule: ProgressionRule) => void;
  onEdit: (rule: ProgressionRule) => void;
  onDelete: (rule: ProgressionRule) => void;
}

function RuleRow({
  rule,
  togglingId,
  deletingId,
  onToggle,
  onEdit,
  onDelete,
}: RuleRowProps) {
  const isToggling = togglingId === rule.id;
  const isDeleting = deletingId === rule.id;

  return (
    <Card variant="default" className="p-xl">
      <div className="flex items-start gap-lg">
        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-fg truncate">
            {rule.exercise_name}
          </p>
          <p className="text-sm text-fg-secondary mt-xs">
            <span className="font-medium">Condición:</span>{" "}
            {CONDITION_LABELS[rule.condition_type]} — {describeCondition(rule)}
          </p>
          <p className="text-sm text-fg-secondary mt-xxs">
            <span className="font-medium">Acción:</span>{" "}
            {ACTION_LABELS[rule.action_type]} → +{rule.action_value}
          </p>
        </div>

        {/* Estado toggle + acciones */}
        <div className="flex flex-col items-end gap-sm flex-shrink-0">
          {/* Badge de estado */}
          <button
            type="button"
            onClick={() => onToggle(rule)}
            disabled={isToggling}
            aria-label={rule.is_active ? "Desactivar regla" : "Activar regla"}
            title={rule.is_active ? "Click para desactivar" : "Click para activar"}
            className={[
              "inline-flex items-center gap-xs px-sm py-xxs rounded-pill text-xs font-semibold border transition-opacity duration-150 cursor-pointer",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              rule.is_active
                ? "text-success border-success/40 bg-success/10 hover:bg-success/20"
                : "text-fg-tertiary border-card-border bg-fill-tertiary hover:bg-fill-secondary",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isToggling ? (
              <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <span
                className={[
                  "inline-block w-1.5 h-1.5 rounded-full",
                  rule.is_active ? "bg-success" : "bg-fg-tertiary",
                ].join(" ")}
              />
            )}
            {rule.is_active ? "Activa" : "Inactiva"}
          </button>

          {/* Botones editar / eliminar */}
          <div className="flex items-center gap-xs">
            <button
              type="button"
              onClick={() => onEdit(rule)}
              aria-label="Editar regla"
              title="Editar regla"
              className="w-7 h-7 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg hover:bg-fill-tertiary transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(rule)}
              disabled={isDeleting}
              aria-label="Eliminar regla"
              title="Eliminar regla"
              className="w-7 h-7 flex items-center justify-center rounded-pill text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Props del panel ───────────────────────────────────────────────────────

export interface ProgressionRulesPanelProps {
  studentId: number;
}

// ─── Panel principal ───────────────────────────────────────────────────────

/**
 * ProgressionRulesPanel — lista, crea, edita y elimina reglas de progresión
 * automática para un alumno. Embebible como sección en el perfil del alumno.
 *
 * Props: { studentId: number }
 */
export const ProgressionRulesPanel: React.FC<ProgressionRulesPanelProps> = ({
  studentId,
}) => {
  const [rules, setRules] = useState<ProgressionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Acción en curso
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal de formulario (crear/editar)
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ProgressionRule | undefined>(
    undefined
  );
  const [formServerError, setFormServerError] = useState<string | null>(null);

  // ConfirmDialog para borrar
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ProgressionRule | null>(
    null
  );
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ─── Carga ────────────────────────────────────────────────────────────

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProgressionRules(studentId);
      setRules(data);
    } catch (err) {
      setError(
        getErrorMessage(err, "No se pudieron cargar las reglas de progresión.")
      );
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // ─── Toggle is_active ─────────────────────────────────────────────────

  const handleToggle = useCallback(
    async (rule: ProgressionRule) => {
      setTogglingId(rule.id);
      try {
        const updated = await updateProgressionRule(studentId, rule.id, {
          is_active: !rule.is_active,
        });
        setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      } catch {
        // fallo silencioso — el estado no cambia
      } finally {
        setTogglingId(null);
      }
    },
    [studentId]
  );

  // ─── Abrir formulario crear ────────────────────────────────────────────

  const handleOpenCreate = useCallback(() => {
    setEditingRule(undefined);
    setFormServerError(null);
    setFormOpen(true);
  }, []);

  // ─── Abrir formulario editar ───────────────────────────────────────────

  const handleOpenEdit = useCallback((rule: ProgressionRule) => {
    setEditingRule(rule);
    setFormServerError(null);
    setFormOpen(true);
  }, []);

  // ─── Submit del formulario (crear / editar) ────────────────────────────

  const handleFormSubmit = useCallback(
    async (data: CreateProgressionRuleData) => {
      setFormServerError(null);
      try {
        if (editingRule) {
          const updated = await updateProgressionRule(
            studentId,
            editingRule.id,
            data
          );
          setRules((prev) =>
            prev.map((r) => (r.id === editingRule.id ? updated : r))
          );
        } else {
          const created = await createProgressionRule(studentId, data);
          setRules((prev) => [created, ...prev]);
        }
        setFormOpen(false);
      } catch (err) {
        setFormServerError(
          getErrorMessage(
            err,
            editingRule
              ? "No se pudo actualizar la regla."
              : "No se pudo crear la regla."
          )
        );
        // Re-lanzar para que react-hook-form no considere el submit exitoso
        throw err;
      }
    },
    [studentId, editingRule]
  );

  // ─── Solicitar confirmación de borrado ────────────────────────────────

  const handleRequestDelete = useCallback((rule: ProgressionRule) => {
    setRuleToDelete(rule);
    setConfirmOpen(true);
  }, []);

  // ─── Confirmar borrado ────────────────────────────────────────────────

  const handleConfirmDelete = useCallback(async () => {
    if (!ruleToDelete) return;
    setConfirmLoading(true);
    try {
      await deleteProgressionRule(studentId, ruleToDelete.id);
      setRules((prev) => prev.filter((r) => r.id !== ruleToDelete.id));
      setConfirmOpen(false);
      setRuleToDelete(null);
    } catch (err) {
      // Mostrar el error como banner de error general (no en el ConfirmDialog)
      setError(getErrorMessage(err, "No se pudo eliminar la regla."));
      setConfirmOpen(false);
    } finally {
      setConfirmLoading(false);
    }
  }, [studentId, ruleToDelete]);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <section className="flex flex-col gap-xl">
      {/* Header de sección */}
      <div className="flex items-center justify-between gap-md">
        <div>
          <h3 className="text-lg font-semibold text-fg">
            Reglas de progresión
          </h3>
          {!loading && rules.length > 0 && (
            <p className="text-sm text-fg-secondary mt-xxs">
              {rules.length} regla{rules.length !== 1 ? "s" : ""} configurada
              {rules.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          iconLeft={<Plus size={14} />}
          onClick={handleOpenCreate}
          disabled={loading}
        >
          Nueva regla
        </Button>
      </div>

      {/* Error de carga */}
      {error && !loading && (
        <ErrorBanner message={error} dismissible />
      )}

      {/* Skeleton */}
      {loading && <RulesSkeleton />}

      {/* Lista de reglas */}
      {!loading && !error && rules.length === 0 && (
        <EmptyState
          icon={<TrendingUp size={24} />}
          title="Sin reglas de progresión"
          description="Crea reglas para que el sistema ajuste automáticamente los parámetros de entrenamiento del alumno."
          action={
            <Button
              variant="primary"
              size="md"
              iconLeft={<Plus size={16} />}
              onClick={handleOpenCreate}
            >
              Crear regla
            </Button>
          }
        />
      )}

      {!loading && rules.length > 0 && (
        <div className="flex flex-col gap-md">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              togglingId={togglingId}
              deletingId={deletingId}
              onToggle={handleToggle}
              onEdit={handleOpenEdit}
              onDelete={handleRequestDelete}
            />
          ))}
        </div>
      )}

      {/* Modal de formulario */}
      <ProgressionRuleForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        rule={editingRule}
        onSubmit={handleFormSubmit}
        serverError={formServerError}
      />

      {/* ConfirmDialog para borrar */}
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar regla"
        description={
          ruleToDelete
            ? `¿Eliminar la regla para "${ruleToDelete.exercise_name}"? Esta acción no se puede deshacer.`
            : "¿Eliminar esta regla?"
        }
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={confirmLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!confirmLoading) {
            setConfirmOpen(false);
            setRuleToDelete(null);
          }
        }}
      />
    </section>
  );
};
