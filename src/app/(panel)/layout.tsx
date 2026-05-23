"use client";

import React from "react";
import { RequireCoach } from "@/components/ui/RequireCoach";
import { Sidebar } from "@/components/ui/Sidebar";
import { Topbar } from "@/components/ui/Topbar";
import { usePathname } from "next/navigation";

/** Deriva el título de la topbar a partir del pathname */
function getTitleFromPathname(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/students")) return "Alumnos";
  if (pathname.startsWith("/routines")) return "Rutinas";
  if (pathname.startsWith("/plannings")) return "Planificaciones";
  if (pathname.startsWith("/profile")) return "Perfil";
  return "Growe Coach";
}

function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = getTitleFromPathname(pathname);

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
        showSearch={pathname === "/" || pathname.startsWith("/students")}
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
      <PanelShell>{children}</PanelShell>
    </RequireCoach>
  );
}
