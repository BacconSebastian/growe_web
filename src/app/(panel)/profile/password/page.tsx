"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { changePassword } from "@/lib/api/profile";
import { getErrorMessage } from "@/lib/utils";

// ─── Schema ──────────────────────────────────────────────────────────────────
// Matchea: min 6 chars, al menos 1 mayúscula, 1 minúscula y 1 número

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "La contraseña actual es requerida"),
    newPassword: z
      .string()
      .min(6, "Mínimo 6 caracteres")
      .regex(
        PASSWORD_REGEX,
        "Debe tener al menos una mayúscula, una minúscula y un número"
      ),
    confirmPassword: z.string().min(1, "Confirmá la nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "La nueva contraseña debe ser diferente a la actual",
    path: ["newPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── Componente ─────────────────────────────────────────────────────────────

/**
 * /profile/password — Cambiar contraseña del coach.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordFormValues) => {
    setSubmitError(null);
    setSuccess(false);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      reset();
      // Pequeño delay para que el usuario vea el mensaje de éxito
      setTimeout(() => router.push("/profile"), 1500);
    } catch (err) {
      setSubmitError(
        getErrorMessage(err, "No se pudo cambiar la contraseña. Verificá la contraseña actual.")
      );
    }
  };

  return (
    <div className="flex flex-col gap-xxl max-w-lg">
      {/* Header */}
      <div>
        <h1
          className="text-display font-bold tracking-tight"
          style={{ margin: 0, letterSpacing: "-0.4px" }}
        >
          Cambiar contraseña
        </h1>
        <p className="text-base text-fg-secondary mt-xs m-0">
          Elegí una contraseña segura con al menos 6 caracteres
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-xl">
        {submitError && (
          <ErrorBanner message={submitError} dismissible />
        )}

        {success && (
          <div
            className="flex items-center gap-sm p-lg rounded-md"
            style={{
              background: "var(--success-alpha-12)",
              border: "1px solid var(--success-alpha-20)",
              color: "var(--success)",
            }}
          >
            <span className="text-sm font-medium">
              Contraseña actualizada correctamente. Redirigiendo...
            </span>
          </div>
        )}

        {/* Contraseña actual */}
        <div className="flex flex-col gap-xs">
          <label className="text-sm font-medium text-fg-secondary">
            Contraseña actual *
          </label>
          <Input
            type={showCurrent ? "text" : "password"}
            error={Boolean(errors.currentPassword)}
            autoComplete="current-password"
            iconRight={
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <p className="text-xxs text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* Nueva contraseña */}
        <div className="flex flex-col gap-xs">
          <label className="text-sm font-medium text-fg-secondary">
            Nueva contraseña *
          </label>
          <Input
            type={showNew ? "text" : "password"}
            error={Boolean(errors.newPassword)}
            autoComplete="new-password"
            iconRight={
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className="text-xxs text-destructive">{errors.newPassword.message}</p>
          )}
        </div>

        {/* Confirmar nueva contraseña */}
        <div className="flex flex-col gap-xs">
          <label className="text-sm font-medium text-fg-secondary">
            Confirmar nueva contraseña *
          </label>
          <Input
            type={showConfirm ? "text" : "password"}
            error={Boolean(errors.confirmPassword)}
            autoComplete="new-password"
            iconRight={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xxs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-sm pt-sm"
          style={{ borderTop: "1px solid var(--separator-subtle)" }}
        >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={success}
            className="flex-1"
          >
            Cambiar contraseña
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={isSubmitting}
            onClick={() => router.push("/profile")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
