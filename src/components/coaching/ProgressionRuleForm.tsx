"use client";

import React, { useEffect, useId } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Modal } from "@/components/ui/Modal";
import type {
  ProgressionRule,
  ProgressionConditionType,
  ProgressionActionType,
  CreateProgressionRuleData,
} from "@/lib/api/types";

// ─── Opciones de selects ────────────────────────────────────────────────────

const CONDITION_OPTIONS: Array<{ value: ProgressionConditionType; label: string }> = [
  { value: "completed_all_sets", label: "Completó todas las series" },
  { value: "rir_above", label: "RIR mayor a" },
  { value: "weight_threshold", label: "Peso mayor a (kg)" },
];

const ACTION_OPTIONS: Array<{ value: ProgressionActionType; label: string }> = [
  { value: "increase_weight_percent", label: "Aumentar peso %" },
  { value: "increase_weight_fixed", label: "Aumentar peso fijo (kg)" },
  { value: "increase_reps", label: "Aumentar repeticiones" },
  { value: "increase_sets", label: "Aumentar series" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function conditionNeedsValue(type: ProgressionConditionType): boolean {
  return type === "rir_above" || type === "weight_threshold";
}

function conditionValuePlaceholder(type: ProgressionConditionType): string {
  if (type === "rir_above") return "Ej: 2 (RIR mínimo)";
  if (type === "weight_threshold") return "Ej: 80 (kg)";
  return "";
}

function buildConditionValue(
  type: ProgressionConditionType,
  rawValue: string
): Record<string, unknown> {
  const num = Number(rawValue);
  switch (type) {
    case "rir_above":
      return { rir: isNaN(num) ? 2 : num };
    case "weight_threshold":
      return { weight_kg: isNaN(num) ? 0 : num };
    case "completed_all_sets":
    default:
      return {};
  }
}

function extractConditionValueRaw(rule: ProgressionRule): string {
  if (rule.condition_type === "rir_above") {
    const v = (rule.condition_value as { rir?: number }).rir;
    return v != null ? String(v) : "";
  }
  if (rule.condition_type === "weight_threshold") {
    const v = (rule.condition_value as { weight_kg?: number }).weight_kg;
    return v != null ? String(v) : "";
  }
  return "";
}

// ─── Schema zod ─────────────────────────────────────────────────────────────

const ruleSchema = z
  .object({
    exercise_name: z
      .string()
      .trim()
      .min(1, "El nombre del ejercicio es obligatorio"),
    condition_type: z.enum([
      "completed_all_sets",
      "rir_above",
      "weight_threshold",
    ] as [ProgressionConditionType, ...ProgressionConditionType[]]),
    condition_value_raw: z.string(),
    action_type: z.enum([
      "increase_weight_percent",
      "increase_weight_fixed",
      "increase_reps",
      "increase_sets",
    ] as [ProgressionActionType, ...ProgressionActionType[]]),
    action_value: z
      .string()
      .min(1, "El valor de la acción es obligatorio")
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
        message: "Debe ser un número mayor a 0",
      }),
  })
  .superRefine((data, ctx) => {
    if (conditionNeedsValue(data.condition_type)) {
      const n = Number(data.condition_value_raw);
      if (!data.condition_value_raw.trim() || isNaN(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresá un valor de condición válido",
          path: ["condition_value_raw"],
        });
      }
    }
  });

type RuleFormValues = z.infer<typeof ruleSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ProgressionRuleFormProps {
  /** Modo: crear o editar. Si se pasa `rule`, edita. */
  rule?: ProgressionRule;
  open: boolean;
  onClose: () => void;
  /** Llamado con el payload listo para crear/actualizar. */
  onSubmit: (data: CreateProgressionRuleData) => Promise<void>;
  /** Error externo (ej: del servidor). */
  serverError?: string | null;
}

// ─── Componente ─────────────────────────────────────────────────────────────

/**
 * ProgressionRuleForm — modal con formulario react-hook-form + zod
 * para crear o editar una regla de progresión automática.
 */
export const ProgressionRuleForm: React.FC<ProgressionRuleFormProps> = ({
  rule,
  open,
  onClose,
  onSubmit,
  serverError,
}) => {
  const conditionSelectId = useId();
  const actionSelectId = useId();
  const isEdit = Boolean(rule);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      exercise_name: rule?.exercise_name ?? "",
      condition_type: rule?.condition_type ?? "completed_all_sets",
      condition_value_raw: rule ? extractConditionValueRaw(rule) : "",
      action_type: rule?.action_type ?? "increase_weight_percent",
      action_value: rule ? String(rule.action_value) : "5",
    },
  });

  // Cuando abre con datos distintos (cambiar regla a editar), resetear
  useEffect(() => {
    if (open) {
      reset({
        exercise_name: rule?.exercise_name ?? "",
        condition_type: rule?.condition_type ?? "completed_all_sets",
        condition_value_raw: rule ? extractConditionValueRaw(rule) : "",
        action_type: rule?.action_type ?? "increase_weight_percent",
        action_value: rule ? String(rule.action_value) : "5",
      });
    }
  }, [open, rule, reset]);

  const conditionType = watch("condition_type");

  const onValid = async (values: RuleFormValues) => {
    const payload: CreateProgressionRuleData = {
      exercise_name: values.exercise_name.trim(),
      condition_type: values.condition_type,
      condition_value: buildConditionValue(
        values.condition_type,
        values.condition_value_raw
      ),
      action_type: values.action_type,
      action_value: Number(values.action_value),
    };
    await onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar regla de progresión" : "Nueva regla de progresión"}
      size="sm"
      dismissable={!isSubmitting}
    >
      <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-xl">
        {serverError && (
          <ErrorBanner message={serverError} />
        )}

        {/* Ejercicio */}
        <Field
          label="Ejercicio *"
          error={errors.exercise_name?.message}
          inputProps={{
            ...register("exercise_name"),
            placeholder: "Nombre del ejercicio",
            autoFocus: true,
          }}
        />

        {/* Condición */}
        <div className="flex flex-col gap-xs">
          <label
            htmlFor={conditionSelectId}
            className="text-sm font-medium text-fg-secondary"
          >
            Condición
          </label>
          <Controller
            name="condition_type"
            control={control}
            render={({ field }) => (
              <select
                id={conditionSelectId}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value as ProgressionConditionType)}
                className="h-11 w-full bg-fill-tertiary text-fg border border-transparent rounded-md px-md text-base outline-none transition-colors duration-150 focus:border-primary focus:bg-fill-quaternary"
              >
                {CONDITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.condition_type && (
            <p className="text-xxs text-destructive">{errors.condition_type.message}</p>
          )}
        </div>

        {/* Valor de condición (solo si la condición lo requiere) */}
        {conditionNeedsValue(conditionType) && (
          <Field
            label="Valor de condición *"
            error={errors.condition_value_raw?.message}
            inputProps={{
              ...register("condition_value_raw"),
              placeholder: conditionValuePlaceholder(conditionType),
              type: "number",
              min: 0,
              step: "any",
            }}
          />
        )}

        {/* Acción */}
        <div className="flex flex-col gap-xs">
          <label
            htmlFor={actionSelectId}
            className="text-sm font-medium text-fg-secondary"
          >
            Acción
          </label>
          <Controller
            name="action_type"
            control={control}
            render={({ field }) => (
              <select
                id={actionSelectId}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value as ProgressionActionType)}
                className="h-11 w-full bg-fill-tertiary text-fg border border-transparent rounded-md px-md text-base outline-none transition-colors duration-150 focus:border-primary focus:bg-fill-quaternary"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.action_type && (
            <p className="text-xxs text-destructive">{errors.action_type.message}</p>
          )}
        </div>

        {/* Valor de la acción */}
        <Field
          label="Valor de la acción *"
          error={errors.action_value?.message}
          inputProps={{
            ...register("action_value"),
            placeholder: "Ej: 5",
            type: "number",
            min: 0.01,
            step: "any",
          }}
        />

        {/* Footer */}
        <div className="flex flex-col gap-sm pt-sm border-t border-card-border">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            className="w-full"
          >
            {isEdit ? "Guardar cambios" : "Crear regla"}
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
      </form>
    </Modal>
  );
};
