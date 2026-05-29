"use client";

import React, { useState } from "react";
import { AlertCircle, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  dismissible?: boolean;
  className?: string;
}

/**
 * ErrorBanner — banner inline de error con ícono y opción de descartar.
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  dismissible = false,
  className = "",
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      className={[
        "flex items-start gap-md p-lg rounded-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "var(--destructive-alpha-12)",
        border: "1px solid var(--destructive-alpha-20)",
        color: "var(--destructive)",
      }}
    >
      <AlertCircle size={16} className="flex-shrink-0 mt-px" />
      <span className="flex-1 text-sm font-medium">{message}</span>

      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Descartar error"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
