"use client";

import React from "react";

interface ChipProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Chip — pill compacto filtrable. Active highlight con primary.
 */
export const Chip: React.FC<ChipProps> = ({
  children,
  active = false,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center rounded-pill px-md py-xs",
        "text-sm font-medium transition-colors duration-150",
        "border whitespace-nowrap",
        active
          ? "text-primary border-primary"
          : "text-fg-secondary border-transparent hover:text-fg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        active
          ? { background: "var(--primary-alpha-12)" }
          : { background: "var(--fill-tertiary)" }
      }
    >
      {children}
    </button>
  );
};
