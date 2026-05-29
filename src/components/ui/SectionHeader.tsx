"use client";

import React from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Slot trailing: acciones, botones, badges */
  action?: React.ReactNode;
  className?: string;
}

/**
 * SectionHeader — título + subtítulo opcional + slot trailing.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className = "",
}) => {
  return (
    <div
      className={["flex items-center justify-between gap-lg flex-wrap", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-xxs min-w-0">
        <h2 className="text-lg font-semibold text-fg m-0 leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-fg-secondary m-0">{subtitle}</p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};
