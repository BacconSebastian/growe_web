"use client";

import React from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

/**
 * SearchInput — input con ícono Search izquierdo y clear button cuando hay valor.
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Buscar...",
  onClear,
  className = "",
}) => {
  const handleClear = () => {
    onChange("");
    onClear?.();
  };

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <span className="absolute left-md top-1/2 -translate-y-1/2 text-fg-tertiary flex items-center pointer-events-none">
        <Search size={16} />
      </span>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          "w-full h-11 bg-fill-tertiary text-fg placeholder-fg-tertiary",
          "border border-transparent rounded-md",
          "text-base outline-none",
          "transition-colors duration-150",
          "focus:border-primary focus:bg-fill-quaternary",
          value ? "pl-10 pr-10" : "pl-10 pr-md",
        ]
          .filter(Boolean)
          .join(" ")}
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-md top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg transition-colors flex items-center"
          aria-label="Limpiar búsqueda"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
