"use client";

import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState — card dashed con ícono circular gradiente.
 * El CTA (action) se pasa como ReactNode; internamente debe usar <Button>.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div
      className={[
        "flex flex-col items-center gap-lg p-4xl rounded-lg text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "var(--card)",
        border: "1.5px dashed var(--separator)",
      }}
    >
      {/* Ícono circular gradiente */}
      <div
        className="w-14 h-14 rounded-pill flex items-center justify-center flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
        }}
      >
        <span style={{ color: "var(--primary)" }}>{icon}</span>
      </div>

      <div className="flex flex-col gap-sm max-w-sm">
        <h3 className="text-xl font-semibold text-fg m-0">{title}</h3>
        <p className="text-base text-fg-secondary m-0">{description}</p>
      </div>

      {action && <div className="mt-sm">{action}</div>}
    </div>
  );
};
