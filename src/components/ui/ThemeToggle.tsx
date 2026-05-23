"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

/**
 * Botón redondo que alterna entre modo oscuro y claro.
 * Persiste la preferencia en localStorage.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={[
        "w-9 h-9 rounded-pill bg-fill-tertiary text-fg-secondary",
        "flex items-center justify-center",
        "hover:bg-fill-secondary hover:text-fg",
        "transition-colors duration-150",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {theme === "dark" ? (
        <Sun size={16} />
      ) : (
        <Moon size={16} />
      )}
    </button>
  );
};
