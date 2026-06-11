"use client";

import React, { useRef, useState, useCallback } from "react";
import { Upload, Image } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { uploadAvatar } from "@/lib/api/profile";
import { getErrorMessage } from "@/lib/utils";

interface AvatarUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (avatarUrl: string) => void;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * AvatarUploadModal — drop zone + file picker + preview para subir avatar.
 * Usa fetch directo con multipart/form-data (via uploadAvatar en profile.ts).
 * Llama onSuccess con la nueva URL para que el caller refresque el AuthContext.
 */
export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setPreview(null);
    setFile(null);
    setError(null);
    setUploading(false);
    setDragging(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateAndSet = (f: File) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Solo se permiten imágenes JPG, PNG o WebP.");
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError("El archivo supera el tamaño máximo de 5 MB.");
      return;
    }
    setError(null);
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSet(selected);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSet(dropped);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const updatedUser = await uploadAvatar(formData);
      const newUrl = updatedUser.avatar_url ?? "";
      onSuccess(newUrl);
      reset();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo subir el avatar. Intentá de nuevo."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cambiar avatar"
      size="sm"
      dismissable={!uploading}
    >
      <div className="flex flex-col gap-xl">
        {/* Drop zone */}
        {!preview && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-md py-xxl rounded-lg cursor-pointer transition-colors"
            style={{
              border: `2px dashed ${dragging ? "var(--primary)" : "var(--separator)"}`,
              background: dragging ? "var(--primary-alpha-08)" : "var(--fill-tertiary)",
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            aria-label="Subir imagen de avatar"
          >
            <div
              className="w-14 h-14 rounded-pill flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
              }}
            >
              <Upload size={24} style={{ color: "var(--primary)" }} />
            </div>
            <div className="flex flex-col gap-xxs text-center">
              <p className="text-base font-semibold text-fg m-0">
                Arrastrá una imagen aquí
              </p>
              <p className="text-sm text-fg-secondary m-0">
                o hacé clic para seleccionar
              </p>
              <p className="text-xs text-fg-tertiary m-0">
                JPG, PNG o WebP — máx. 5 MB
              </p>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="flex flex-col items-center gap-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Vista previa del avatar"
              className="rounded-lg object-cover"
              style={{ width: 200, height: 200 }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreview(null);
                setFile(null);
                setError(null);
              }}
            >
              Cambiar imagen
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive m-0">{error}</p>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-sm">
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={uploading}
            disabled={!file || Boolean(error)}
            onClick={handleUpload}
            className="w-full"
          >
            Subir avatar
          </Button>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={handleClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      {/* Input file oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileInput}
        aria-hidden="true"
      />
    </Modal>
  );
};
