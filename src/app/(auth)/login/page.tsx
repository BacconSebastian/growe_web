"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { isCoach, getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// ─── Schema de validación ─────────────────────────────────────────────────────

const loginSchema = z.object({
  // Acepta email O username — el backend resuelve cuál es
  identifier: z.string().trim().min(1, "Ingresá tu email o usuario"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Página ───────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, user, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Estado especial: login OK pero role no es coach
  const [nonCoachUser, setNonCoachUser] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    setNonCoachUser(false);

    try {
      await login(values.identifier, values.password);

      // login() ya seteó el user en el contexto; lo leemos del store
      // No podemos usar `user` del hook acá porque aún no re-renderizó
      // Necesitamos leer de localStorage directamente para la validación
      const stored = localStorage.getItem("growe.web.auth");
      const parsed = stored ? (JSON.parse(stored) as { user: { role_id: number } }) : null;

      if (parsed && !isCoach(parsed.user)) {
        setNonCoachUser(true);
        return;
      }

      router.replace("/dashboard");
    } catch (err) {
      setSubmitError(
        getErrorMessage(err, "Ocurrió un error al iniciar sesión. Intentá de nuevo.")
      );
    }
  };

  // Si el usuario ya está logueado como coach, redirigir al dashboard
  if (user && isCoach(user)) {
    router.replace("/dashboard");
    return null;
  }

  // Pantalla de "no sos coach"
  if (nonCoachUser) {
    return (
      <div className="flex justify-center">
        <div
          className="w-full max-w-sm flex flex-col gap-lg p-xxxl rounded-3xl"
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          <div className="flex flex-col items-center gap-md text-center">
            <div
              className="w-14 h-14 rounded-pill flex items-center justify-center"
              style={{
                background: "var(--warning-alpha-20)",
                color: "var(--warning)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-fg">Acceso solo para coaches</h2>
            <p className="text-base text-fg-secondary">
              Esta cuenta no tiene acceso al panel web.
              Solo coaches pueden acceder al panel.
              Los alumnos deben usar la app mobile.
            </p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              logout();
              setNonCoachUser(false);
            }}
          >
            Volver al login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {/* Theme toggle en la esquina superior derecha (relativo al auth shell) */}
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

        <p
          className="text-xs text-center uppercase tracking-widest -mt-sm"
          style={{ color: "var(--fg-tertiary)", letterSpacing: "1.5px" }}
        >
          Coach Panel
        </p>

        {/* Título */}
        <div className="flex flex-col gap-xs text-center">
          <h1 className="text-xxl font-bold text-fg">Hola de nuevo</h1>
          <p className="text-base text-fg-secondary">
            Iniciá sesión para gestionar tus alumnos
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-lg"
          noValidate
        >
          <Field
            label="Email o usuario"
            error={errors.identifier?.message}
            inputProps={{
              ...register("identifier"),
              type: "text",
              placeholder: "entrenador@growe.fit",
              autoComplete: "username email",
              icon: <Mail size={16} />,
            }}
          />

          <Field
            label="Contraseña"
            error={errors.password?.message}
            inputProps={{
              ...register("password"),
              type: showPassword ? "text" : "password",
              placeholder: "••••••••",
              autoComplete: "current-password",
              icon: <Lock size={16} />,
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

          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

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
          >
            Ingresar
          </Button>
        </form>

        {/* Divider */}
        <div
          className="h-px"
          style={{ background: "var(--separator-subtle)" }}
        />

        {/* Footer */}
        <p className="text-xs text-center text-fg-secondary">
          Solo coaches pueden acceder al panel web.
          <br />
          Los alumnos deben usar la app mobile.
        </p>
      </div>
    </div>
  );
}
