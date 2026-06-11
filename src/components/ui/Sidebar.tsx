"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarDays,
  User,
  LogOut,
  Layers,
  UsersRound,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: SidebarItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
  },
  {
    href: "/students",
    label: "Alumnos",
    icon: <Users size={18} />,
  },
  {
    href: "/routines",
    label: "Rutinas",
    icon: <Dumbbell size={18} />,
  },
  {
    href: "/plannings",
    label: "Planificaciones",
    icon: <CalendarDays size={18} />,
  },
  {
    href: "/exercises",
    label: "Ejercicios",
    icon: <Layers size={18} />,
  },
  {
    href: "/groups",
    label: "Grupos",
    icon: <UsersRound size={18} />,
  },
  {
    href: "/templates",
    label: "Templates",
    icon: <BookOpen size={18} />,
  },
];

/**
 * Sidebar del panel de coach.
 * - Logo growe_flame.svg arriba.
 * - Navegación principal con active state.
 * - Footer con perfil + logout.
 */
export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="flex flex-col gap-xs py-xxl px-md"
      style={{
        gridArea: "sidebar",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        width: "var(--sidebar-width)",
        minHeight: "100vh",
      }}
    >
      {/* ─── Brand ─── */}
      <div className="flex items-center gap-sm px-md pb-xxl">
        <div className="w-8 h-8 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/growe_flame.svg"
            alt="Growe"
            width={32}
            height={32}
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-lg font-bold tracking-tight">Growe Coach</span>
      </div>

      {/* ─── Navegación principal ─── */}
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={[
            "flex items-center gap-md px-md py-md rounded-sm",
            "text-base font-medium transition-colors duration-150 no-underline",
            isActive(item.href)
              ? "text-primary"
              : "text-fg-secondary hover:text-fg",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            isActive(item.href)
              ? { background: "var(--sidebar-item-active)" }
              : undefined
          }
          onMouseEnter={(e) => {
            if (!isActive(item.href)) {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "var(--sidebar-item-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive(item.href)) {
              (e.currentTarget as HTMLAnchorElement).style.background = "";
            }
          }}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}

      {/* ─── Sección cuenta ─── */}
      <div className="mt-auto">
        <p
          className="text-xs font-semibold uppercase tracking-wider px-md pb-sm pt-lg"
          style={{ color: "var(--fg-tertiary)" }}
        >
          Cuenta
        </p>

        <Link
          href="/profile"
          className="flex items-center gap-md px-md py-md rounded-sm text-base font-medium text-fg-secondary hover:text-fg no-underline transition-colors duration-150"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "var(--sidebar-item-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "";
          }}
        >
          <User size={18} className="flex-shrink-0" />
          <span>Perfil</span>
        </Link>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-md px-md py-md rounded-sm text-base font-medium text-fg-secondary hover:text-fg transition-colors duration-150"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--sidebar-item-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "";
          }}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
