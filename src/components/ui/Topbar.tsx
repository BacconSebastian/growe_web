"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./Avatar";
import { Input } from "./Input";
import { Search, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserInitials } from "@/lib/utils";

interface TopbarProps {
  title: string;
  /** Si se provee, muestra el input de búsqueda */
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  /** Placeholder del buscador */
  searchPlaceholder?: string;
}

/**
 * Topbar del panel: título, buscador opcional, theme toggle y avatar del usuario.
 * El avatar abre un dropdown con accesos a Perfil y Cerrar sesión.
 */
export const Topbar: React.FC<TopbarProps> = ({
  title,
  showSearch = false,
  onSearch,
  searchPlaceholder = "Buscar alumnos, rutinas...",
}) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = user ? getUserInitials(user) : "?";
  const avatarSrc = user?.avatar_url ?? null;

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [dropdownOpen]);

  return (
    <header
      className="flex items-center justify-between gap-lg px-xxl"
      style={{
        gridArea: "topbar",
        background: "var(--bg)",
        borderBottom: "1px solid var(--separator-subtle)",
        height: "var(--topbar-height)",
      }}
    >
      <div className="text-xl font-bold">{title}</div>

      <div className="flex items-center gap-md">
        {showSearch && (
          <div className="flex-1 max-w-[360px]">
            <Input
              icon={<Search size={16} />}
              placeholder={searchPlaceholder}
              onChange={(e) => onSearch?.(e.target.value)}
              className="h-9"
            />
          </div>
        )}

        <ThemeToggle />

        {/* Avatar con dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Menú de cuenta"
            aria-expanded={dropdownOpen}
            className="flex items-center rounded-pill transition-opacity hover:opacity-80"
          >
            <Avatar
              src={avatarSrc}
              initials={initials}
              alt={user?.username ?? "Coach"}
              size="md"
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-sm rounded-md overflow-hidden"
              style={{
                background: "var(--card-elevated)",
                border: "1px solid var(--card-border-light)",
                boxShadow: "var(--shadow-elevated)",
                minWidth: "180px",
                zIndex: 50,
              }}
            >
              {user && (
                <div
                  className="px-lg py-md"
                  style={{ borderBottom: "1px solid var(--separator-subtle)" }}
                >
                  <p className="text-sm font-semibold text-fg m-0 truncate">
                    {user.first_name ? `${user.first_name} ${user.last_name ?? ""}`.trim() : user.username}
                  </p>
                  <p className="text-xs text-fg-secondary m-0 truncate">
                    @{user.username}
                  </p>
                </div>
              )}

              <Link
                href="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-sm px-lg py-md text-sm font-medium text-fg no-underline transition-colors hover:bg-fill-tertiary"
              >
                <User size={14} className="flex-shrink-0 text-fg-secondary" />
                Mi perfil
              </Link>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-sm px-lg py-md text-sm font-medium transition-colors hover:bg-fill-tertiary"
                style={{ color: "var(--destructive)" }}
              >
                <LogOut size={14} className="flex-shrink-0" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
