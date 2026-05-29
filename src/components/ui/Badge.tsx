"use client";

import React from "react";

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "neutral" | "purple";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  primary: { background: "var(--primary-alpha-16)", color: "var(--primary)" },
  success: { background: "var(--success-alpha-12)", color: "var(--success)" },
  warning: { background: "var(--warning-alpha-20)", color: "var(--warning)" },
  danger:  { background: "var(--destructive-alpha-12)", color: "var(--destructive)" },
  neutral: { background: "var(--fill-tertiary)", color: "var(--fg-secondary)" },
  purple:  { background: "var(--purple-alpha-12)", color: "var(--purple)" },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "text-xs px-sm py-xxs",
  md: "text-sm px-md py-xs",
};

/**
 * Badge — pill compacto para status, roles y etiquetas.
 * Variantes: primary, success, warning, danger, neutral, purple.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "sm",
  className = "",
}) => {
  return (
    <span
      className={[
        "inline-flex items-center rounded-pill font-semibold whitespace-nowrap",
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
};
