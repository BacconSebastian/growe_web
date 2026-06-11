"use client";

/**
 * StudentSettingsModal — configura la alerta de inactividad de un alumno.
 *
 * Props:
 *   open            — controla visibilidad del modal
 *   studentId       — ID del alumno
 *   currentThreshold — valor actual en días (null = sin alerta configurada)
 *   onClose         — callback al cerrar sin guardar
 *   onSaved         — callback al guardar con éxito (recibe el nuevo threshold)
 */

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, BellOff } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { updateStudentSettings } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  /**
   * Días de inactividad antes de disparar la alerta.
   * Nullable: null significa "sin alerta".
   * Cuando se activa debe ser un entero ≥ 1 y ≤ 365.
   */
  enabled: z.boolean(),
  days: z.coerce
    .number()
    .int("Debe ser un número entero.")
    .min(1, "El mínimo es 1 día.")
    .max(365, "El máximo es 365 días.")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StudentSettingsModalProps {
  open: boolean;
  studentId: number;
  currentThreshold?: number | null;
  onClose: () => void;
  onSaved?: (newThreshold: number | null) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const StudentSettingsModal: React.FC<StudentSettingsModalProps> = ({
  open,
  studentId,
  currentThreshold,
  onClose,
  onSaved,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      enabled: currentThreshold != null,
      days: currentThreshold ?? 7,
    },
  });

  const [saveError, setSaveError] = React.useState<string | null>(null);

  const enabled = watch("enabled");

  // Re-sincronizar cuando el modal abre con un nuevo threshold externo
  useEffect(() => {
    if (open) {
      setSaveError(null);
      reset({
        enabled: currentThreshold != null,
        days: currentThreshold ?? 7,
      });
    }
  }, [open, currentThreshold, reset]);

  const onSubmit = async (values: FormValues) => {
    setSaveError(null);
    try {
      const threshold = values.enabled ? (values.days ?? 7) : null;
      await updateStudentSettings(studentId, {
        inactivity_threshold_days: threshold as number,
      });
      onSaved?.(threshold);
      onClose();
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo guardar la configuración."));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configuración del alumno"
      size="sm"
      dismissable={!isSubmitting}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex flex-col gap-xl">
          {saveError && <ErrorBanner message={saveError} />}

          {/* Toggle de alerta de inactividad */}
          <div
            className="flex items-start gap-lg p-lg rounded-md"
            style={{ background: "var(--fill-tertiary)" }}
          >
            <div
              className="w-10 h-10 rounded-pill flex items-center justify-center flex-shrink-0"
              style={{
                background: enabled
                  ? "var(--primary-alpha-12)"
                  : "var(--fill-secondary)",
              }}
            >
              {enabled ? (
                <Bell size={18} style={{ color: "var(--primary)" }} />
              ) : (
                <BellOff size={18} style={{ color: "var(--fg-tertiary)" }} />
              )}
            </div>

            <div className="flex flex-col gap-xs flex-1">
              <div className="flex items-center justify-between gap-md">
                <span className="text-sm font-semibold text-fg">
                  Alerta de inactividad
                </span>
                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => setValue("enabled", !enabled)}
                  className="relative inline-flex h-6 w-11 items-center rounded-pill transition-colors focus:outline-none focus-visible:ring-2 flex-shrink-0"
                  style={{
                    background: enabled ? "var(--primary)" : "var(--fill-secondary)",
                  }}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-pill bg-white shadow transition-transform"
                    style={{
                      transform: enabled ? "translateX(22px)" : "translateX(4px)",
                    }}
                  />
                </button>
              </div>
              <p className="text-xs text-fg-secondary m-0">
                {enabled
                  ? "Recibirás una alerta cuando el alumno no entrene durante el período indicado."
                  : "Sin alerta de inactividad configurada."}
              </p>
            </div>
          </div>

          {/* Campo de días — solo visible cuando está habilitado */}
          {enabled && (
            <div className="flex flex-col gap-xs">
              <label
                htmlFor="inactivity-days"
                className="text-sm font-medium text-fg-secondary"
              >
                Días sin entrenar para disparar la alerta
              </label>
              <div className="flex items-center gap-md">
                <input
                  id="inactivity-days"
                  type="number"
                  min={1}
                  max={365}
                  className={[
                    "w-28 h-11 px-md bg-fill-tertiary text-fg placeholder-fg-tertiary",
                    "border rounded-md text-base outline-none",
                    "transition-colors duration-150",
                    "focus:border-primary focus:bg-fill-quaternary",
                    errors.days
                      ? "border-destructive focus:border-destructive"
                      : "border-transparent",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  {...register("days")}
                />
                <span className="text-sm text-fg-secondary">días</span>
              </div>
              {errors.days && (
                <p className="text-xxs text-destructive">{errors.days.message}</p>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col gap-sm pt-sm">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              className="w-full"
            >
              Guardar
            </Button>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isSubmitting}
                onClick={onClose}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
