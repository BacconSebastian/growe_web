"use client";

import React from "react";
import { RequireCoach } from "@/components/ui/RequireCoach";
import { Sidebar } from "@/components/ui/Sidebar";
import { Topbar } from "@/components/ui/Topbar";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getDisplayName } from "@/lib/utils";
import { AliasProvider } from "@/contexts/AliasContext";

/** Deriva el título de la topbar a partir del pathname */
function getTitleFromPathname(pathname: string): string {
  if (pathname === "/" || pathname === "/dashboard") return "Dashboard";
  if (pathname.startsWith("/students")) return "Alumnos";
  if (pathname.startsWith("/routines")) return "Rutinas";
  if (pathname.startsWith("/plannings")) return "Planificaciones";
  if (pathname.startsWith("/exercises")) return "Ejercicios";
  if (pathname.startsWith("/groups")) return "Grupos";
  if (pathname.startsWith("/profile")) return "Perfil";
  return "Growe Coach";
}

function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // En el dashboard el título es el saludo personalizado en vez de "Dashboard".
  const isDashboard = pathname === "/" || pathname === "/dashboard";
  const firstName = user ? getDisplayName(user).split(" ")[0] : "Coach";
  const title = isDashboard
    ? `Hola, ${firstName}`
    : getTitleFromPathname(pathname);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--sidebar-width) 1fr",
        gridTemplateRows: "var(--topbar-height) 1fr",
        gridTemplateAreas: '"sidebar topbar" "sidebar main"',
        minHeight: "100vh",
      }}
    >
      <Sidebar />
      <Topbar
        title={title}
        showSearch={pathname === "/dashboard" || pathname.startsWith("/students")}
      />
      <main
        style={{
          gridArea: "main",
          padding: "var(--space-xxl)",
          overflowY: "auto",
          maxWidth: "var(--content-max-width)",
          width: "100%",
        }}
      >
        {children}
      </main>
    </div>
  );
}

/**
 * Layout del panel de coach.
 * Incluye RequireCoach (valida role_id === 2), Sidebar y Topbar.
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireCoach>
      <AliasProvider>
        <PanelShell>{children}</PanelShell>
      </AliasProvider>
    </RequireCoach>
  );
}
