"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Texto base mostrado en el botón (se le agrega el conteo si hay selección). */
  placeholder: string;
  ariaLabel?: string;
}

/**
 * MultiSelect — dropdown de selección múltiple con checkboxes.
 * Botón estilizado con tokens + popover con click-outside para cerrar.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  ariaLabel,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const hasSelection = selected.length > 0;
  const label = hasSelection ? `${placeholder} (${selected.length})` : placeholder;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={[
          "h-11 inline-flex items-center gap-sm text-sm rounded-pill border px-lg",
          "bg-fill-tertiary hover:bg-fill-quaternary transition-colors duration-150 cursor-pointer outline-none",
          hasSelection ? "border-primary" : "border-transparent",
        ].join(" ")}
      >
        <span className={hasSelection ? "text-fg" : "text-fg-secondary"}>
          {label}
        </span>
        <ChevronDown size={14} className="text-fg-tertiary" />
      </button>

      {open && (
        <div
          className="absolute left-0 mt-xs rounded-md overflow-hidden z-50 min-w-[210px]"
          style={{
            background: "var(--card-elevated)",
            border: "1px solid var(--card-border-light)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          <div className="max-h-[280px] overflow-y-auto py-xs">
            {options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className="w-full flex items-center gap-sm px-md py-sm text-sm text-fg text-left hover:bg-fill-tertiary transition-colors"
                >
                  <span
                    className="w-4 h-4 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderRadius: "4px",
                      background: checked ? "var(--primary)" : "transparent",
                      border: checked
                        ? "none"
                        : "1px solid var(--separator)",
                    }}
                  >
                    {checked && (
                      <Check size={12} style={{ color: "var(--on-primary)" }} />
                    )}
                  </span>
                  {o.label}
                </button>
              );
            })}
          </div>

          {hasSelection && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-md py-sm text-xs text-fg-secondary hover:bg-fill-tertiary transition-colors text-left"
              style={{ borderTop: "1px solid var(--separator-subtle)" }}
            >
              Limpiar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
}
