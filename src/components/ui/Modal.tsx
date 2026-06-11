"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  /** Si false, no se cierra al hacer click en el backdrop ni con Escape. Default true. */
  dismissable?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm w-full",
  md: "max-w-lg w-full",
  lg: "max-w-2xl w-full",
};

/**
 * Modal — overlay full-screen + card centrada.
 * Wrapper sobre <dialog> HTML nativo.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = "md",
  dismissable = true,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      if (dismissable) onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [dismissable, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!dismissable) return;
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="p-0 bg-transparent border-0 outline-none max-h-screen overflow-visible backdrop:bg-black/60"
      style={{ width: "100vw", maxWidth: "100vw" }}
    >
      <div
        className={[
          "relative flex flex-col rounded-lg mx-auto my-16 overflow-hidden",
          sizeClasses[size],
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          background: "var(--card-elevated)",
          border: "1px solid var(--card-border-light)",
          boxShadow: "var(--shadow-modal, 0 24px 64px rgba(0,0,0,0.5))",
          maxHeight: "calc(100vh - 8rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tinte de gradiente característico (ámbar → primary) sobre la base */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
          }}
        />

        {/* Header */}
        {(title || dismissable) && (
          <div
            className="relative flex items-center justify-between gap-lg px-xxl py-lg flex-shrink-0"
            style={{ borderBottom: "1px solid var(--separator-subtle)" }}
          >
            {title && (
              <h2 className="text-lg font-semibold text-fg m-0">{title}</h2>
            )}
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-fg transition-colors"
                style={{ background: "var(--fill-tertiary)" }}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Body scrolleable */}
        <div className="relative flex-1 overflow-y-auto px-xxl py-xl">
          {children}
        </div>
      </div>
    </dialog>
  );
};
