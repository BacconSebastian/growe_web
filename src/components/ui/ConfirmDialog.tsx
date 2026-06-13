"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

type ConfirmVariant = "danger" | "primary" | "success";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: ConfirmVariant;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

/**
 * ConfirmDialog — modal de confirmación con cancel + confirm.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  onClose,
  loading = false,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      dismissable={!loading}
    >
      <div className="flex flex-col gap-xl">
        <p className="text-base text-fg-secondary m-0">{description}</p>

        <div className="flex gap-sm">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            disabled={loading}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            variant={confirmVariant}
            size="md"
            className="flex-1"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
