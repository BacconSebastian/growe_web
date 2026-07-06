"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { resetPassword } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// ─── Schema de validación (espejo del mobile) ────────────────────────────────

const schema = z
  .object({
    newPassword: z
      .string()
      .min(6, { message: "Mínimo 6 caracteres" })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Incluye mayúscula, minúscula y número",
      }),
    confirmPassword: z.string().min(6, { message: "Confirmación inválida" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

// ─── Componente interno (usa useSearchParams — requiere Suspense) ─────────────

function ResetPasswordForm() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    setSuccessMessage(null);

    if (!token) {
      setSubmitError(
        "Token de recuperación no encontrado. Solicitá un nuevo enlace."
      );
      return;
    }

    try {
      const result = await resetPassword({ token, newPassword: values.newPassword });
      const message = result?.message ?? "Contraseña restablecida exitosamente.";
      setSuccessMessage(message);
    } catch (err) {
      setSubmitError(
        getErrorMessage(
          err,
          "No pudimos restablecer tu contraseña. El enlace puede haber expirado."
        )
      );
    }
  };

  return (
    <div className="flex justify-center">
      {/* Theme toggle fijo arriba a la derecha */}
      <div className="fixed top-xl right-xl z-20">
        <ThemeToggle />
      </div>

      <div
        className="relative w-full max-w-sm flex flex-col gap-lg p-xxxl rounded-3xl"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        {/* Logo */}
        {theme === "dark" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/growe_wordmark.svg"
            alt="Growe"
            className="h-9 w-auto mx-auto block"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/growe_wordmark_black.svg"
            alt="Growe"
            className="h-9 w-auto mx-auto block"
          />
        )}

        {/* Ícono + Título */}
        <div className="flex flex-col items-center gap-md text-center">
          <div
            className="w-14 h-14 rounded-pill flex items-center justify-center"
            style={{
              background: "var(--primary-alpha-12)",
              color: "var(--primary)",
            }}
          >
            <KeyRound size={24} />
          </div>
          <div className="flex flex-col gap-xs">
            <h1 className="text-xxl font-bold text-fg">Nueva contraseña</h1>
            <p className="text-base text-fg-secondary">
              Creá una contraseña con al menos 6 caracteres, una mayúscula, una minúscula y un número.
            </p>
          </div>
        </div>

        {/* Token no encontrado */}
        {!token && !submitError && (
          <p
            className="text-sm text-center px-md py-sm rounded-md"
            style={{
              background: "var(--destructive-alpha-12)",
              color: "var(--destructive)",
            }}
          >
            Token de recuperación no encontrado. Solicitá un nuevo enlace.
          </p>
        )}

        {/* Mensaje de éxito */}
        {successMessage ? (
          <div className="flex flex-col gap-lg">
            <p
              className="text-sm text-center px-md py-sm rounded-md"
              style={{
                background: "var(--success-alpha-12)",
                color: "var(--success)",
              }}
            >
              {successMessage}
            </p>
            <Link href="/login" className="w-full">
              <Button variant="primary" size="lg" className="w-full">
                Ir al inicio de sesión
              </Button>
            </Link>
          </div>
        ) : (
          /* Formulario */
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-lg"
            noValidate
          >
            <Field
              label="Nueva contraseña"
              error={errors.newPassword?.message}
              inputProps={{
                ...register("newPassword"),
                type: showPassword ? "text" : "password",
                placeholder: "••••••••",
                autoComplete: "new-password",
                icon: <KeyRound size={16} />,
                iconRight: (
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="text-fg-tertiary hover:text-fg-secondary transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                ),
              }}
            />

            <Field
              label="Confirmar contraseña"
              error={errors.confirmPassword?.message}
              inputProps={{
                ...register("confirmPassword"),
                type: showConfirmPassword ? "text" : "password",
                placeholder: "••••••••",
                autoComplete: "new-password",
                icon: <KeyRound size={16} />,
                iconRight: (
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    tabIndex={-1}
                    className="text-fg-tertiary hover:text-fg-secondary transition-colors"
                    aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                ),
              }}
            />

            {/* Error de submit */}
            {submitError && (
              <p
                className="text-sm text-center px-md py-sm rounded-md"
                style={{
                  background: "var(--destructive-alpha-12)",
                  color: "var(--destructive)",
                }}
              >
                {submitError}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full"
              disabled={!token}
            >
              Restablecer contraseña
            </Button>
          </form>
        )}

        {/* Divisor */}
        <div
          className="h-px"
          style={{ background: "var(--separator-subtle)" }}
        />

        {/* Volver al login / pedir nuevo enlace */}
        {!token ? (
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center gap-xs text-sm font-medium transition-colors"
            style={{ color: "var(--primary)" }}
          >
            Solicitá un nuevo enlace
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-xs text-sm font-medium transition-colors"
            style={{ color: "var(--fg-secondary)" }}
          >
            <ArrowLeft size={14} />
            Volver al inicio de sesión
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Página (con Suspense obligatorio para useSearchParams) ──────────────────

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
