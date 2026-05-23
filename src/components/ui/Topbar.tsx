"use client";

import React from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./Avatar";
import { Input } from "./Input";
import { Search } from "lucide-react";
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
 */
export const Topbar: React.FC<TopbarProps> = ({
  title,
  showSearch = false,
  onSearch,
  searchPlaceholder = "Buscar alumnos, rutinas...",
}) => {
  const { user } = useAuth();

  const initials = user ? getUserInitials(user) : "?";
  const avatarSrc = user?.avatar_url ?? null;

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

        <Avatar
          src={avatarSrc}
          initials={initials}
          alt={user?.username ?? "Coach"}
          size="md"
        />
      </div>
    </header>
  );
};
