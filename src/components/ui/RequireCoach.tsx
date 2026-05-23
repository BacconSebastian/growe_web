"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isCoach } from "@/lib/utils";
import { Button } from "./Button";

interface RequireCoachProps {
  children: React.ReactNode;
}

/**
 * Wrapper client-side que protege el panel del coach.
 *
 * Comportamiento:
 * - Mientras initializing → spinner de carga.
 * - Sin user → redirect a /login.
 * - User con role_id !== 2 → mensaje de acceso denegado + botón logout.
 * - User coach → renderiza children.
 */
export const RequireCoach: React.FC<RequireCoachProps> = ({ children }) => {
  const { user, initializing, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && !user) {
      router.replace("/login");
    }
  }, [initializing, user, router]);

  // Estado de carga inicial
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-md text-fg-secondary">
          <span className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Sin usuario → redirect ya disparado en el useEffect
  if (!user) {
    return null;
  }

  // Usuario no es coach
  if (!isCoach(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-xxl">
        <div
          className="w-full max-w-sm flex flex-col gap-lg text-center p-xxxl rounded-3xl"
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          <div
            className="w-14 h-14 rounded-pill mx-auto flex items-center justify-center"
            style={{
              background: "var(--destructive-alpha-12)",
              color: "var(--destructive)",
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
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          <div className="flex flex-col gap-sm">
            <h1 className="text-xl font-bold text-fg">Acceso denegado</h1>
            <p className="text-base text-fg-secondary">
              Solo coaches pueden acceder al panel web.
              Los alumnos deben usar la app mobile.
            </p>
          </div>

          <Button variant="secondary" size="md" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
