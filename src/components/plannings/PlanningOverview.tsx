"use client";

/**
 * PlanningOverview.tsx
 *
 * Vista de la planning completa: lista de semanas con nombre/descripción,
 * por semana un resumen de días con sus rutinas.
 *
 * Acciones:
 * - Agregar semana
 * - Reordenar semanas (mover arriba/abajo)
 * - Borrar semana
 * - Copiar/pegar semana (copy-from / append-from)
 * - Editar nombre/descripción de semana
 * - Set semana actual (setCurrentWeekOverride / setStudentPlanningCurrentWeek)
 * - Activar/desactivar planning (ActivateDeactivateModal)
 * - Edición de semana embebida (PlanningWeekDetail en panel lateral)
 *
 * Props: { mode: "own"|"coach"; studentId?: number; planningId: number }
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Clipboard,
  Pencil,
  Check,
  Calendar,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonBox } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

import { PlanningStatusBadge } from "./PlanningStatusBadge";
import { ActivateDeactivateModal } from "./ActivateDeactivateModal";
import { PlanningWeekDetail } from "./PlanningWeekDetail";

import {
  getPlanning,
  addWeek,
  updateWeek,
  deleteWeek,
  reorderWeeks,
  copyWeekRoutines,
  setCurrentWeekOverride,
  updatePlanning,
  type AddWeekPayload,
  type UpdateWeekPayload,
} from "@/lib/api/plannings";
import {
  getStudentPlanning,
  coachAddWeek,
  coachUpdateWeek,
  coachDeleteWeek,
  coachReorderWeeks,
  coachCopyWeekRoutines,
  appendWeekFromCopy,
  setStudentPlanningCurrentWeek,
  updateStudentPlanning,
  duplicateStudentPlanningToLibrary,
} from "@/lib/api/coaching";
import { BulkAssignPlanningModal } from "@/components/coaching/BulkAssignPlanningModal";

import type { Planning, PlanningWeek } from "@/lib/api/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanningOverviewProps {
  mode: "own" | "coach";
  studentId?: number;
  planningId: number;
}

interface WeekClipboard {
  weekId: number;
  planningId: number;
  weekNumber: number;
  label: string;
}

// ─── EditWeekModal ────────────────────────────────────────────────────────────

interface EditWeekModalProps {
  open: boolean;
  week: PlanningWeek | null;
  onClose: () => void;
  onSave: (weekId: number, payload: UpdateWeekPayload) => Promise<void>;
}

const EditWeekModal: React.FC<EditWeekModalProps> = ({
  open,
  week,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && week) {
      setName(week.name ?? "");
      setDescription(week.description ?? "");
      setError(null);
    }
  }, [open, week]);

  const handleSave = async () => {
    if (!week) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(week.id, {
        name: name || null,
        description: description || null,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar semana"
      size="sm"
      dismissable={!saving}
    >
      <div className="flex flex-col gap-lg">
        {error && <ErrorBanner message={error} />}
        <div className="flex flex-col gap-sm">
          <div className="flex flex-col gap-xs">
            <label className="text-sm font-medium text-fg-secondary">
              Nombre (opcional)
            </label>
            <Input
              placeholder="Ej: Semana de descarga"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-sm font-medium text-fg-secondary">
              Descripción (opcional)
            </label>
            <Input
              placeholder="Notas sobre esta semana..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-sm">
          <Button
            variant="primary"
            size="md"
            loading={saving}
            onClick={handleSave}
            className="w-full"
          >
            Guardar
          </Button>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
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

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

interface ConfirmDeleteModalProps {
  open: boolean;
  weekNumber: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  weekNumber,
  onClose,
  onConfirm,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar semana"
      size="sm"
      dismissable={!deleting}
    >
      <div className="flex flex-col gap-lg">
        {error && <ErrorBanner message={error} />}
        <p className="text-sm text-fg-secondary m-0">
          ¿Eliminar la Semana {weekNumber}? Esta acción no se puede deshacer y
          borra todas las rutinas y ejercicios del snapshot.
        </p>
        <div className="flex flex-col gap-sm">
          <Button
            variant="danger"
            size="md"
            loading={deleting}
            onClick={handleConfirm}
            className="w-full"
          >
            Eliminar semana
          </Button>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              disabled={deleting}
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

// ─── WeekCard ─────────────────────────────────────────────────────────────────

interface WeekCardProps {
  week: PlanningWeek;
  weekIndex: number;
  totalWeeks: number;
  isCurrentWeek: boolean;
  clipboard: WeekClipboard | null;
  canPaste: boolean;
  mode: "own" | "coach";
  planningId: number;
  onEdit: (week: PlanningWeek) => void;
  onDelete: (week: PlanningWeek) => void;
  onMoveUp: (weekId: number) => void;
  onMoveDown: (weekId: number) => void;
  onCopy: (week: PlanningWeek) => void;
  onPaste: (targetWeek: PlanningWeek) => void;
  onSetCurrent: (weekNumber: number) => void;
  onSelectForDetail: (week: PlanningWeek) => void;
}

const WeekCard: React.FC<WeekCardProps> = ({
  week,
  weekIndex,
  totalWeeks,
  isCurrentWeek,
  clipboard,
  canPaste,
  mode,
  planningId,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onCopy,
  onPaste,
  onSetCurrent,
  onSelectForDetail,
}) => {
  const routineCount = week.routines.length;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--card)",
        border: `1px solid ${isCurrentWeek ? "var(--primary)" : "var(--card-border)"}`,
        boxShadow: isCurrentWeek ? "0 0 0 2px var(--primary-alpha-20)" : "var(--shadow-card)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-md px-xl py-lg"
        style={{ borderBottom: "1px solid var(--separator-subtle)" }}
      >
        <div className="flex items-center gap-md min-w-0">
          {/* Número de semana */}
          <div
            className="w-9 h-9 rounded-pill flex items-center justify-center flex-shrink-0 text-sm font-bold"
            style={
              isCurrentWeek
                ? { background: "var(--primary)", color: "var(--on-primary)" }
                : {
                    background: "var(--fill-tertiary)",
                    color: "var(--fg-secondary)",
                  }
            }
          >
            {week.week_number}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-sm flex-wrap">
              <span className="text-sm font-semibold text-fg">
                {week.name ? week.name : `Semana ${week.week_number}`}
              </span>
              {isCurrentWeek && (
                <Badge variant="primary" size="sm">
                  Actual
                </Badge>
              )}
            </div>
            {week.description && (
              <p className="text-xs text-fg-tertiary m-0 truncate mt-xxs">
                {week.description}
              </p>
            )}
            <p className="text-xs text-fg-tertiary m-0 mt-xxs">
              {routineCount === 0
                ? "Sin rutinas"
                : `${routineCount} rutina${routineCount !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-xs flex-shrink-0">
          {/* Reordenar */}
          <button
            type="button"
            onClick={() => onMoveUp(week.id)}
            disabled={weekIndex === 0}
            className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors disabled:opacity-30"
            style={{ background: "var(--fill-tertiary)" }}
            title="Mover arriba"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(week.id)}
            disabled={weekIndex === totalWeeks - 1}
            className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors disabled:opacity-30"
            style={{ background: "var(--fill-tertiary)" }}
            title="Mover abajo"
          >
            <ChevronDown size={14} />
          </button>

          {/* Copiar semana */}
          <button
            type="button"
            onClick={() => onCopy(week)}
            className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors"
            style={{ background: "var(--fill-tertiary)" }}
            title="Copiar contenido de esta semana"
          >
            <Copy size={14} />
          </button>

          {/* Pegar semana */}
          {canPaste && clipboard && clipboard.weekId !== week.id && (
            <button
              type="button"
              onClick={() => onPaste(week)}
              className="w-8 h-8 flex items-center justify-center rounded-pill transition-colors"
              style={{
                background: "var(--primary-alpha-12)",
                color: "var(--primary)",
              }}
              title={`Pegar contenido de Semana ${clipboard.weekNumber}`}
            >
              <Clipboard size={14} />
            </button>
          )}

          {/* Setear semana actual */}
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => onSetCurrent(week.week_number)}
              className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-primary transition-colors"
              style={{ background: "var(--fill-tertiary)" }}
              title="Establecer como semana actual"
            >
              <Calendar size={14} />
            </button>
          )}

          {/* Editar nombre */}
          <button
            type="button"
            onClick={() => onEdit(week)}
            className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors"
            style={{ background: "var(--fill-tertiary)" }}
            title="Editar nombre y descripción"
          >
            <Pencil size={14} />
          </button>

          {/* Eliminar */}
          <button
            type="button"
            onClick={() => onDelete(week)}
            className="w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-destructive transition-colors"
            style={{ background: "var(--fill-tertiary)" }}
            title="Eliminar semana"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Lista de rutinas (solo nombres) */}
      {routineCount > 0 && (
        <div className="px-xl py-md flex flex-wrap gap-xs">
          {week.routines.map((r) => (
            <Badge key={r.id} variant="neutral" size="sm">
              {r.routine_title}
            </Badge>
          ))}
        </div>
      )}

      {/* Botón editar semana */}
      <div
        className="px-xl py-md"
        style={{ borderTop: "1px solid var(--separator-subtle)" }}
      >
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<Pencil size={13} />}
          onClick={() => onSelectForDetail(week)}
          className="w-full justify-center"
        >
          Editar rutinas de esta semana
        </Button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PlanningOverview: React.FC<PlanningOverviewProps> = ({
  mode,
  studentId,
  planningId,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id ?? 0;

  const [planning, setPlanning] = useState<Planning | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Estado de semana seleccionada para el panel de detalle
  const [selectedWeek, setSelectedWeek] = useState<PlanningWeek | null>(null);

  // Modales
  const [editWeekTarget, setEditWeekTarget] = useState<PlanningWeek | null>(null);
  const [deleteWeekTarget, setDeleteWeekTarget] = useState<PlanningWeek | null>(null);
  const [activateModalOpen, setActivateModalOpen] = useState(false);

  // Clipboard de semana (in-memory)
  const [clipboard, setClipboard] = useState<WeekClipboard | null>(null);

  // Modal de asignación bulk (solo mode=own)
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  // ─── Load ───────────────────────────────────────────────────────────────────

  const loadPlanning = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let data: Planning;
      if (mode === "coach" && studentId != null) {
        data = await getStudentPlanning(studentId, planningId);
      } else {
        data = await getPlanning(planningId);
      }
      setPlanning(data);
    } catch (err) {
      setLoadError(getErrorMessage(err, "No se pudo cargar la planificación."));
    } finally {
      setLoading(false);
    }
  }, [mode, studentId, planningId]);

  useEffect(() => {
    loadPlanning();
  }, [loadPlanning]);

  // ─── API adapter (switchea por mode) ────────────────────────────────────────

  const api = useMemo(() => {
    if (mode === "coach" && studentId != null) {
      return {
        addWeek: (payload: AddWeekPayload) =>
          coachAddWeek(studentId, planningId, payload),
        updateWeek: (weekId: number, payload: UpdateWeekPayload) =>
          coachUpdateWeek(studentId, weekId, payload),
        deleteWeek: (weekId: number) =>
          coachDeleteWeek(studentId, weekId),
        reorderWeeks: (weekIds: number[]) =>
          coachReorderWeeks(studentId, planningId, { week_ids: weekIds }),
        copyWeekRoutines: (sourceWeekId: number, targetWeekId: number) =>
          coachCopyWeekRoutines(studentId, sourceWeekId, targetWeekId),
        appendWeekFromCopy: (sourceWeekId: number) =>
          appendWeekFromCopy(studentId, planningId, sourceWeekId),
        setCurrentWeek: (weekNumber: number | null) =>
          setStudentPlanningCurrentWeek(studentId, planningId, weekNumber),
        updatePlanning: (payload: Partial<Planning>) =>
          updateStudentPlanning(studentId, planningId, payload),
        canArchive: false,
      };
    }
    return {
      addWeek: (payload: AddWeekPayload) => addWeek(planningId, payload),
      updateWeek: (weekId: number, payload: UpdateWeekPayload) =>
        updateWeek(weekId, payload),
      deleteWeek: (weekId: number) => deleteWeek(weekId),
      reorderWeeks: (weekIds: number[]) =>
        reorderWeeks(planningId, { week_ids: weekIds }),
      copyWeekRoutines: (sourceWeekId: number, targetWeekId: number) =>
        copyWeekRoutines(sourceWeekId, targetWeekId),
      appendWeekFromCopy: (sourceWeekId: number) => {
        // own: addWeek vacía + copyWeekRoutines
        return addWeek(planningId, {}).then((newWeek) =>
          copyWeekRoutines(sourceWeekId, newWeek.id).then(() => newWeek)
        );
      },
      setCurrentWeek: (weekNumber: number | null) =>
        setCurrentWeekOverride(planningId, weekNumber),
      updatePlanning: (payload: Partial<Planning>) =>
        updatePlanning(planningId, payload),
      canArchive: true,
    };
  }, [mode, studentId, planningId]);

  // ─── Semanas ────────────────────────────────────────────────────────────────

  const weeks = useMemo(() => {
    return [...(planning?.weeks ?? [])].sort(
      (a, b) => a.week_number - b.week_number
    );
  }, [planning?.weeks]);

  const handleAddWeek = async () => {
    setActionError(null);
    try {
      const newWeek = await api.addWeek({});
      setPlanning((prev) =>
        prev
          ? { ...prev, weeks: [...(prev.weeks ?? []), { ...newWeek, routines: [] }] }
          : prev
      );
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo agregar la semana."));
    }
  };

  const handleUpdateWeek = async (
    weekId: number,
    payload: UpdateWeekPayload
  ) => {
    const updated = await api.updateWeek(weekId, payload);
    setPlanning((prev) =>
      prev
        ? {
            ...prev,
            weeks: (prev.weeks ?? []).map((w) =>
              w.id === weekId ? { ...w, ...updated } : w
            ),
          }
        : prev
    );
  };

  const handleDeleteWeek = async (weekId: number) => {
    await api.deleteWeek(weekId);
    setPlanning((prev) =>
      prev
        ? {
            ...prev,
            weeks: (prev.weeks ?? []).filter((w) => w.id !== weekId),
          }
        : prev
    );
    if (selectedWeek?.id === weekId) setSelectedWeek(null);
  };

  const handleMoveUp = async (weekId: number) => {
    const currentWeeks = [...weeks];
    const idx = currentWeeks.findIndex((w) => w.id === weekId);
    if (idx <= 0) return;
    [currentWeeks[idx - 1], currentWeeks[idx]] = [
      currentWeeks[idx],
      currentWeeks[idx - 1],
    ];
    const newOrder = currentWeeks.map((w) => w.id);
    setActionError(null);
    try {
      await api.reorderWeeks(newOrder);
      setPlanning((prev) =>
        prev
          ? {
              ...prev,
              weeks: currentWeeks.map((w, i) => ({
                ...w,
                week_number: i + 1,
              })),
            }
          : prev
      );
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo reordenar."));
    }
  };

  const handleMoveDown = async (weekId: number) => {
    const currentWeeks = [...weeks];
    const idx = currentWeeks.findIndex((w) => w.id === weekId);
    if (idx < 0 || idx >= currentWeeks.length - 1) return;
    [currentWeeks[idx], currentWeeks[idx + 1]] = [
      currentWeeks[idx + 1],
      currentWeeks[idx],
    ];
    const newOrder = currentWeeks.map((w) => w.id);
    setActionError(null);
    try {
      await api.reorderWeeks(newOrder);
      setPlanning((prev) =>
        prev
          ? {
              ...prev,
              weeks: currentWeeks.map((w, i) => ({
                ...w,
                week_number: i + 1,
              })),
            }
          : prev
      );
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo reordenar."));
    }
  };

  const handleCopyWeek = (week: PlanningWeek) => {
    setClipboard({
      weekId: week.id,
      planningId,
      weekNumber: week.week_number,
      label: week.name ?? `Semana ${week.week_number}`,
    });
  };

  const handlePasteWeek = async (targetWeek: PlanningWeek) => {
    if (!clipboard) return;
    setActionError(null);
    try {
      await api.copyWeekRoutines(clipboard.weekId, targetWeek.id);
      // Recargar para reflejar el nuevo contenido
      await loadPlanning();
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo pegar la semana."));
    }
  };

  const handleAppendFromClipboard = async () => {
    if (!clipboard) return;
    setActionError(null);
    try {
      await api.appendWeekFromCopy(clipboard.weekId);
      await loadPlanning();
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo agregar la semana."));
    }
  };

  const handleSetCurrentWeek = async (weekNumber: number) => {
    setActionError(null);
    try {
      await api.setCurrentWeek(weekNumber);
      setPlanning((prev) =>
        prev ? { ...prev, current_week_override: weekNumber } : prev
      );
    } catch (err) {
      setActionError(
        getErrorMessage(err, "No se pudo establecer la semana actual.")
      );
    }
  };

  const handleActivateDeactivate = async (payload: {
    status: Planning["status"];
    start_date?: string;
  }) => {
    if (!planning) return;
    const updated = await api.updatePlanning(payload);
    setPlanning((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  const handleWeekUpdated = useCallback((updatedWeek: PlanningWeek) => {
    setSelectedWeek(updatedWeek);
    setPlanning((prev) =>
      prev
        ? {
            ...prev,
            weeks: (prev.weeks ?? []).map((w) =>
              w.id === updatedWeek.id ? updatedWeek : w
            ),
          }
        : prev
    );
  }, []);

  // ─── Render: loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-xl">
        {/* Header skeleton */}
        <div className="flex items-center justify-between gap-md">
          <div className="flex flex-col gap-sm flex-1">
            <SkeletonLine height={28} width="40%" />
            <SkeletonLine height={16} width="25%" />
          </div>
          <SkeletonBox width={100} height={36} />
        </div>
        {/* Semanas skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBox key={i} height={120} />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-lg items-center py-xxl">
        <ErrorBanner message={loadError} />
        <Button variant="outline" onClick={loadPlanning}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!planning) return null;

  const currentWeekNumber = planning.current_week_override ?? planning.current_week ?? 1;
  const canPaste =
    clipboard !== null && clipboard.planningId === planningId;

  // ─── Render: panel de detalle de semana embebido ────────────────────────────

  if (selectedWeek) {
    const weekData = (planning.weeks ?? []).find((w) => w.id === selectedWeek.id) ?? selectedWeek;
    return (
      <div className="flex flex-col gap-xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-md">
          <button
            type="button"
            onClick={() => setSelectedWeek(null)}
            className="flex items-center gap-sm text-sm text-fg-secondary hover:text-fg transition-colors"
          >
            <ArrowLeft size={16} />
            {planning.title}
          </button>
          <span className="text-fg-tertiary">/</span>
          <span className="text-sm font-semibold text-fg">
            {weekData.name ?? `Semana ${weekData.week_number}`}
          </span>
        </div>

        {actionError && (
          <ErrorBanner
            message={actionError}
            dismissible
          />
        )}

        <PlanningWeekDetail
          mode={mode}
          studentId={studentId}
          planningId={planningId}
          week={weekData}
          currentUserId={currentUserId}
          onWeekUpdated={handleWeekUpdated}
        />
      </div>
    );
  }

  // ─── Render: overview de semanas ─────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-xl">
      {/* Header del planning */}
      <div
        className="rounded-lg px-xxl py-xl flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex flex-col gap-xs min-w-0">
          <div className="flex items-center gap-sm flex-wrap">
            <h1 className="text-xl font-bold text-fg m-0">{planning.title}</h1>
            <PlanningStatusBadge status={planning.status} />
          </div>
          <p className="text-sm text-fg-secondary m-0">
            {weeks.length} {weeks.length === 1 ? "semana" : "semanas"}
            {currentWeekNumber && weeks.length > 0
              ? ` · Semana actual: ${currentWeekNumber}`
              : ""}
          </p>
        </div>

        {/* Acciones del planning */}
        <div className="flex items-center gap-sm flex-wrap flex-shrink-0">
          {planning.status !== "completed" &&
            planning.status !== "archived" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActivateModalOpen(true)}
              >
                {planning.status === "active"
                  ? "Desactivar"
                  : planning.status === "scheduled"
                  ? "Cancelar programación"
                  : "Activar"}
              </Button>
            )}

          {/* Asignar a alumnos — solo disponible en planning propia (mode=own) */}
          {mode === "own" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAssignOpen(true)}
            >
              Asignar a alumnos
            </Button>
          )}

          {mode === "coach" && studentId != null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await duplicateStudentPlanningToLibrary(
                    studentId,
                    planningId
                  );
                } catch (err) {
                  setActionError(
                    getErrorMessage(err, "No se pudo duplicar.")
                  );
                }
              }}
            >
              Duplicar a mi biblioteca
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <ErrorBanner
          message={actionError}
          dismissible
        />
      )}

      {/* Clipboard indicator */}
      {clipboard && clipboard.planningId === planningId && (
        <div
          className="flex items-center justify-between gap-md px-xl py-md rounded-lg"
          style={{ background: "var(--primary-alpha-08)", border: "1px solid var(--primary-alpha-20)" }}
        >
          <div className="flex items-center gap-sm">
            <Clipboard size={14} style={{ color: "var(--primary)" }} />
            <span className="text-sm text-fg">
              Copiado: <strong>{clipboard.label}</strong>
            </span>
          </div>
          <div className="flex items-center gap-sm">
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus size={13} />}
              onClick={handleAppendFromClipboard}
            >
              Pegar como semana nueva
            </Button>
            <button
              type="button"
              onClick={() => setClipboard(null)}
              className="w-7 h-7 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors"
              style={{ background: "var(--fill-tertiary)" }}
            >
              <Check size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Lista de semanas */}
      {weeks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-md py-xxl rounded-lg"
          style={{
            border: "2px dashed var(--border)",
            background: "var(--fill-quaternary)",
          }}
        >
          <p className="text-sm text-fg-secondary m-0 text-center">
            Esta planificación no tiene semanas aún.
          </p>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Plus size={14} />}
            onClick={handleAddWeek}
          >
            Agregar semana
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {weeks.map((week, idx) => (
            <WeekCard
              key={week.id}
              week={week}
              weekIndex={idx}
              totalWeeks={weeks.length}
              isCurrentWeek={week.week_number === currentWeekNumber}
              clipboard={clipboard}
              canPaste={canPaste}
              mode={mode}
              planningId={planningId}
              onEdit={setEditWeekTarget}
              onDelete={setDeleteWeekTarget}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onCopy={handleCopyWeek}
              onPaste={handlePasteWeek}
              onSetCurrent={handleSetCurrentWeek}
              onSelectForDetail={setSelectedWeek}
            />
          ))}

          <Button
            variant="outline"
            size="md"
            iconLeft={<Plus size={16} />}
            onClick={handleAddWeek}
            className="w-full"
          >
            Agregar semana
          </Button>
        </div>
      )}

      {/* Modals */}
      <EditWeekModal
        open={editWeekTarget !== null}
        week={editWeekTarget}
        onClose={() => setEditWeekTarget(null)}
        onSave={handleUpdateWeek}
      />

      <ConfirmDeleteModal
        open={deleteWeekTarget !== null}
        weekNumber={deleteWeekTarget?.week_number ?? 0}
        onClose={() => setDeleteWeekTarget(null)}
        onConfirm={async () => {
          if (!deleteWeekTarget) return;
          await handleDeleteWeek(deleteWeekTarget.id);
        }}
      />

      {planning && (
        <ActivateDeactivateModal
          open={activateModalOpen}
          planning={planning}
          onClose={() => setActivateModalOpen(false)}
          onUpdate={handleActivateDeactivate}
        />
      )}

      {/* Modal de asignación bulk — solo mode=own */}
      {mode === "own" && planning && bulkAssignOpen && (
        <BulkAssignPlanningModal
          open={bulkAssignOpen}
          planningId={planningId}
          planningTitle={planning.title}
          onClose={() => setBulkAssignOpen(false)}
        />
      )}
    </div>
  );
};
