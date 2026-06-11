"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/utils";
import type { Planning } from "@/lib/api/types";

interface ActivateDeactivateModalProps {
  open: boolean;
  planning: Planning;
  onClose: () => void;
  onUpdate: (payload: { status: Planning["status"]; start_date?: string }) => Promise<void>;
}

type ActionType = "activate" | "deactivate" | "schedule" | "cancel_schedule";

function resolveAction(status: Planning["status"]): ActionType {
  if (status === "active") return "deactivate";
  if (status === "scheduled") return "cancel_schedule";
  return "activate";
}

export const ActivateDeactivateModal: React.FC<ActivateDeactivateModalProps> = ({
  open,
  planning,
  onClose,
  onUpdate,
}) => {
  const [action, setAction] = useState<ActionType>(() => resolveAction(planning.status));
  const [startDate, setStartDate] = useState(planning.start_date?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar action cuando cambia la planning (ej. re-apertura del modal)
  React.useEffect(() => {
    setAction(resolveAction(planning.status));
    setStartDate(planning.start_date?.slice(0, 10) ?? "");
    setError(null);
  }, [planning.status, planning.start_date, open]);

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);

    try {
      if (action === "activate") {
        await onUpdate({ status: "active" });
      } else if (action === "deactivate") {
        await onUpdate({ status: "draft" });
      } else if (action === "schedule") {
        if (!startDate) {
          setError("Seleccioná una fecha de inicio para programar.");
          setSaving(false);
          return;
        }
        await onUpdate({ status: "scheduled", start_date: startDate });
      } else if (action === "cancel_schedule") {
        await onUpdate({ status: "draft" });
      }
      onClose();
    } catch (err) {
      // Mostrar el mensaje exacto que devuelve el backend (ej: start_date futuro)
      setError(getErrorMessage(err, "No se pudo actualizar la planificación."));
    } finally {
      setSaving(false);
    }
  };

  const isScheduled = planning.status === "scheduled";
  const isActive = planning.status === "active";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Estado de la planificación"
      size="sm"
      dismissable={!saving}
    >
      <div className="flex flex-col gap-xl">
        {error && <ErrorBanner message={error} dismissible />}

        <div className="flex flex-col gap-sm">
          <p className="text-sm text-fg-secondary m-0">
            Estado actual:{" "}
            <strong className="text-fg">{statusLabel(planning.status)}</strong>
          </p>

          {/* Opciones de acción */}
          {!isScheduled && !isActive && (
            <>
              {/* Activar directo */}
              <ActionOption
                selected={action === "activate"}
                onSelect={() => setAction("activate")}
                title="Activar ahora"
                description="La planificación queda activa de inmediato. Cualquier otra activa pasará a borrador."
              />

              {/* Programar */}
              <ActionOption
                selected={action === "schedule"}
                onSelect={() => setAction("schedule")}
                title="Programar inicio"
                description="El cron la activará automáticamente en la fecha indicada."
              />
            </>
          )}

          {isActive && (
            <ActionOption
              selected={action === "deactivate"}
              onSelect={() => setAction("deactivate")}
              title="Desactivar (pasar a borrador)"
              description="La planificación dejará de estar activa. Podés reactivarla después."
            />
          )}

          {isScheduled && (
            <ActionOption
              selected={action === "cancel_schedule"}
              onSelect={() => setAction("cancel_schedule")}
              title="Cancelar programación"
              description="La planificación vuelve a estado borrador y no se activará automáticamente."
            />
          )}
        </div>

        {/* Input de fecha para programar */}
        {action === "schedule" && (
          <div className="flex flex-col gap-xs">
            <label className="text-sm font-medium text-fg-secondary">Fecha de inicio</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
        )}

        <div className="flex flex-col gap-sm pt-sm" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
          <Button
            variant={action === "deactivate" || action === "cancel_schedule" ? "secondary" : "primary"}
            size="md"
            loading={saving}
            onClick={handleConfirm}
            className="w-full"
          >
            {confirmLabel(action)}
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(status: Planning["status"]): string {
  const map: Record<Planning["status"], string> = {
    active:    "Activa",
    draft:     "Borrador",
    scheduled: "Programada",
    completed: "Completada",
    archived:  "Archivada",
  };
  return map[status] ?? status;
}

function confirmLabel(action: ActionType): string {
  if (action === "activate") return "Activar ahora";
  if (action === "deactivate") return "Desactivar";
  if (action === "schedule") return "Programar";
  return "Cancelar programación";
}

interface ActionOptionProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}

const ActionOption: React.FC<ActionOptionProps> = ({ selected, onSelect, title, description }) => (
  <button
    type="button"
    onClick={onSelect}
    className="text-left rounded-md p-md transition-colors w-full"
    style={{
      background: selected ? "var(--primary-alpha-08)" : "var(--fill-tertiary)",
      border: `2px solid ${selected ? "var(--primary)" : "transparent"}`,
    }}
  >
    <p className="text-sm font-semibold m-0" style={{ color: selected ? "var(--primary)" : "var(--fg)" }}>
      {title}
    </p>
    <p className="text-xs text-fg-secondary m-0 mt-xs">{description}</p>
  </button>
);
