"use client";

import React from "react";
import { CalendarDays, Users, Dumbbell, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getDisplayName } from "@/lib/utils";

/**
 * Dashboard — Fase 1 placeholder.
 * La implementación completa con métricas, alumnos recientes y solicitudes
 * se desarrollará en Fase 2.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user ? getDisplayName(user).split(" ")[0] : "Coach";

  return (
    <div className="flex flex-col gap-xxl">
      {/* Header */}
      <div className="flex items-end justify-between gap-lg flex-wrap">
        <div>
          <h1
            className="text-display font-bold tracking-tight"
            style={{ margin: 0, letterSpacing: "-0.4px" }}
          >
            Hola, {displayName}
          </h1>
          <p className="text-base text-fg-secondary mt-xs">
            Aquí estará el resumen de tu plantel.
          </p>
        </div>
      </div>

      {/* Placeholder Fase 2 */}
      <div
        className="flex flex-col items-center gap-lg p-4xl rounded-lg text-center"
        style={{
          background: "var(--card)",
          border: "1px dashed var(--separator)",
        }}
      >
        <div
          className="w-14 h-14 rounded-pill flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
          }}
        >
          <LayoutDashboard size={24} style={{ color: "var(--primary)" }} />
        </div>
        <div className="flex flex-col gap-sm">
          <h2 className="text-xl font-semibold text-fg">Dashboard — Fase 2</h2>
          <p className="text-base text-fg-secondary max-w-sm">
            Acá vas a ver las métricas del plantel, solicitudes de coaching pendientes
            y los alumnos que entrenaron recientemente.
          </p>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-3 gap-lg w-full max-w-xl mt-md">
          <Link
            href="/students"
            className="no-underline"
            style={{ display: "contents" }}
          >
            <div
              className="relative flex flex-col gap-md p-xl rounded-lg cursor-pointer overflow-hidden"
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                }}
              />
              <div className="relative flex items-center gap-md">
                <div
                  className="w-9 h-9 rounded-pill flex items-center justify-center"
                  style={{
                    background: "var(--primary-alpha-16)",
                    color: "var(--primary)",
                  }}
                >
                  <Users size={18} />
                </div>
                <span className="text-base font-semibold text-fg">Alumnos</span>
              </div>
              <p className="relative text-sm text-fg-secondary">
                Gestioná tu plantel
              </p>
            </div>
          </Link>

          <Link
            href="/routines"
            className="no-underline"
            style={{ display: "contents" }}
          >
            <div
              className="relative flex flex-col gap-md p-xl rounded-lg cursor-pointer overflow-hidden"
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                }}
              />
              <div className="relative flex items-center gap-md">
                <div
                  className="w-9 h-9 rounded-pill flex items-center justify-center"
                  style={{
                    background: "var(--warning-alpha-20)",
                    color: "var(--warning)",
                  }}
                >
                  <Dumbbell size={18} />
                </div>
                <span className="text-base font-semibold text-fg">Rutinas</span>
              </div>
              <p className="relative text-sm text-fg-secondary">
                Mis plantillas
              </p>
            </div>
          </Link>

          <Link
            href="/plannings"
            className="no-underline"
            style={{ display: "contents" }}
          >
            <div
              className="relative flex flex-col gap-md p-xl rounded-lg cursor-pointer overflow-hidden"
              style={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                }}
              />
              <div className="relative flex items-center gap-md">
                <div
                  className="w-9 h-9 rounded-pill flex items-center justify-center"
                  style={{
                    background: "var(--purple-alpha-16)",
                    color: "var(--purple)",
                  }}
                >
                  <CalendarDays size={18} />
                </div>
                <span className="text-base font-semibold text-fg">Planificaciones</span>
              </div>
              <p className="relative text-sm text-fg-secondary">
                Ciclos y semanas
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
