"use client";

/**
 * AddExerciseMediaPanel — panel de alta de media para la galería de ejercicios.
 *
 * Renderiza dos modos:
 *  - "file"  → file picker + progreso de subida a S3
 *  - "link"  → form react-hook-form + zod para URL externa
 *
 * El componente se muestra en el estado "addMode" del ExerciseGalleryModal
 * (dentro del mismo dialog, sin abrir ventana nueva).
 */

import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Link2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  initExerciseMediaUpload,
  confirmExerciseMediaUpload,
  uploadToS3,
  addExerciseMediaLink,
} from "@/lib/api/exercise-media";
import { getErrorMessage } from "@/lib/utils";

// ─── Límites ──────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/quicktime"];

// ─── Schema del formulario de link ───────────────────────────────────────────

const linkSchema = z.object({
  url: z
    .string()
    .min(1, "La URL es requerida")
    .max(2048, "La URL no puede superar los 2048 caracteres")
    .url("Ingresá una URL válida (http/https)"),
  mediaType: z.enum(["video", "image"], {
    required_error: "Seleccioná el tipo de media",
  }),
  title: z
    .string()
    .max(120, "El título no puede superar los 120 caracteres")
    .optional(),
});

type LinkFormValues = z.infer<typeof linkSchema>;

// ─── Helpers de dimensiones ───────────────────────────────────────────────────

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

interface VideoMeta {
  width: number;
  height: number;
  duration: number;
  thumbnailBlob: Blob | null;
}

function getVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = () => {
      const { videoWidth, videoHeight, duration } = video;
      // Seek para obtener thumbnail
      video.currentTime = Math.min(1, duration || 0);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration,
            thumbnailBlob: null,
          });
          URL.revokeObjectURL(url);
          return;
        }
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => {
            resolve({
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration,
              thumbnailBlob: blob,
            });
            URL.revokeObjectURL(url);
          },
          "image/jpeg",
          0.8
        );
      } catch {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          thumbnailBlob: null,
        });
        URL.revokeObjectURL(url);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo procesar el video"));
    };

    video.src = url;
  });
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface AddExerciseMediaPanelProps {
  exerciseId: number;
  onBack: () => void;
  onSuccess: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const AddExerciseMediaPanel: React.FC<AddExerciseMediaPanelProps> = ({
  exerciseId,
  onBack,
  onSuccess,
}) => {
  const [tab, setTab] = useState<"file" | "link">("file");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Subida de archivo ────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadStatus("");

    const isImage = ALLOWED_IMAGE_MIMES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_MIMES.includes(file.type);

    if (!isImage && !isVideo) {
      setUploadError(
        "Tipo de archivo no soportado. Usá JPG, PNG, WebP, MP4 o MOV."
      );
      e.target.value = "";
      return;
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      setUploadError("La imagen no puede superar los 10 MB.");
      e.target.value = "";
      return;
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setUploadError("El video no puede superar los 50 MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      if (isImage) {
        setUploadStatus("Leyendo imagen…");
        const { width, height } = await getImageDimensions(file);

        setUploadStatus("Iniciando subida…");
        const initRes = await initExerciseMediaUpload(exerciseId, {
          mediaType: "image",
          mimeType: file.type,
          sizeBytes: file.size,
        });

        setUploadStatus("Subiendo imagen…");
        await uploadToS3(initRes.media.uploadUrl, file, file.type);

        setUploadStatus("Confirmando…");
        await confirmExerciseMediaUpload(exerciseId, initRes.mediaId, {
          width,
          height,
        });
      } else {
        // Video
        setUploadStatus("Procesando video…");
        const meta = await getVideoMeta(file);

        setUploadStatus("Iniciando subida…");
        const initRes = await initExerciseMediaUpload(exerciseId, {
          mediaType: "video",
          mimeType: file.type,
          sizeBytes: file.size,
          thumbnailMimeType: meta.thumbnailBlob ? "image/jpeg" : undefined,
        });

        setUploadStatus("Subiendo video…");
        await uploadToS3(initRes.media.uploadUrl, file, file.type);

        if (initRes.thumbnail && meta.thumbnailBlob) {
          setUploadStatus("Subiendo thumbnail…");
          await uploadToS3(
            initRes.thumbnail.uploadUrl,
            meta.thumbnailBlob,
            "image/jpeg"
          );
        }

        setUploadStatus("Confirmando…");
        await confirmExerciseMediaUpload(exerciseId, initRes.mediaId, {
          durationSeconds: Math.round(meta.duration),
          width: meta.width,
          height: meta.height,
        });
      }

      setUploadStatus("");
      onSuccess();
    } catch (err) {
      setUploadError(
        getErrorMessage(err, "Error al subir el archivo. Intentá de nuevo.")
      );
      setUploadStatus("");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ─── Form de link ─────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: { mediaType: "video" },
  });

  const onSubmitLink = async (values: LinkFormValues) => {
    try {
      await addExerciseMediaLink(exerciseId, {
        mediaType: values.mediaType,
        url: values.url,
        title: values.title || null,
      });
      reset();
      onSuccess();
    } catch (err) {
      // react-hook-form no tiene setError global fácil; usamos estado local
      setUploadError(
        getErrorMessage(err, "Error al agregar el link. Revisá la URL.")
      );
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-lg">
      {/* Header con volver */}
      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={onBack}
          disabled={uploading || isSubmitting}
          className="flex items-center gap-xs text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{ color: "var(--primary)" }}
        >
          <ArrowLeft size={16} />
          Volver a la galería
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-lg p-xxs gap-xxs"
        style={{ background: "var(--fill-tertiary)" }}
      >
        {(["file", "link"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setUploadError(null);
              setUploadStatus("");
            }}
            className="flex-1 flex items-center justify-center gap-xs py-xs rounded-md text-sm font-semibold transition-all"
            style={
              tab === t
                ? {
                    background: "var(--card-elevated)",
                    color: "var(--fg)",
                    boxShadow: "var(--shadow-subtle)",
                  }
                : { color: "var(--fg-secondary)" }
            }
          >
            {t === "file" ? (
              <>
                <Upload size={14} />
                Subir archivo
              </>
            ) : (
              <>
                <Link2 size={14} />
                Agregar link
              </>
            )}
          </button>
        ))}
      </div>

      {/* Error global */}
      {uploadError && (
        <div
          className="p-md rounded-md text-sm"
          style={{
            background: "var(--destructive-alpha-12)",
            color: "var(--destructive)",
          }}
        >
          {uploadError}
        </div>
      )}

      {/* Contenido por tab */}
      {tab === "file" ? (
        <div className="flex flex-col gap-md">
          <p className="text-sm m-0" style={{ color: "var(--fg-secondary)" }}>
            Aceptamos imágenes (JPG, PNG, WebP ≤ 10 MB) y videos (MP4, MOV ≤ 50 MB).
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            className="sr-only"
            onChange={handleFileChange}
            disabled={uploading}
          />

          {uploading ? (
            <div
              className="flex flex-col items-center justify-center gap-md py-xxl rounded-lg"
              style={{ border: "1px solid var(--separator-subtle)" }}
            >
              <Loader2
                size={32}
                className="animate-spin"
                style={{ color: "var(--primary)" }}
              />
              <span className="text-sm" style={{ color: "var(--fg-secondary)" }}>
                {uploadStatus || "Subiendo…"}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setUploadError(null);
                fileInputRef.current?.click();
              }}
              className="flex flex-col items-center justify-center gap-md py-xxl rounded-lg transition-colors hover:opacity-80"
              style={{
                border: "1.5px dashed var(--separator)",
                background: "transparent",
              }}
            >
              <Upload size={28} style={{ color: "var(--fg-tertiary)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--fg-secondary)" }}>
                Elegir imagen o video
              </span>
            </button>
          )}
        </div>
      ) : (
        /* ── Form de link ── */
        <form
          onSubmit={handleSubmit(onSubmitLink)}
          className="flex flex-col gap-md"
        >
          {/* URL */}
          <div className="flex flex-col gap-xs">
            <label
              htmlFor="media-url"
              className="text-sm font-semibold"
              style={{ color: "var(--fg-secondary)" }}
            >
              URL del media *
            </label>
            <input
              id="media-url"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              disabled={isSubmitting}
              {...register("url")}
              className="h-11 px-md rounded-lg text-sm outline-none transition-colors"
              style={{
                background: "var(--fill-tertiary)",
                border: errors.url
                  ? "1px solid var(--destructive)"
                  : "1px solid var(--separator-subtle)",
                color: "var(--fg)",
              }}
            />
            {errors.url && (
              <span className="text-xs" style={{ color: "var(--destructive)" }}>
                {errors.url.message}
              </span>
            )}
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-xs">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--fg-secondary)" }}
            >
              Tipo *
            </span>
            <div className="flex gap-sm">
              {(["video", "image"] as const).map((mt) => (
                <label
                  key={mt}
                  className="flex items-center gap-xs cursor-pointer text-sm"
                  style={{ color: "var(--fg)" }}
                >
                  <input
                    type="radio"
                    value={mt}
                    disabled={isSubmitting}
                    {...register("mediaType")}
                    className="accent-primary"
                    style={{ accentColor: "var(--primary)" }}
                  />
                  {mt === "video" ? "Video" : "Imagen"}
                </label>
              ))}
            </div>
            {errors.mediaType && (
              <span className="text-xs" style={{ color: "var(--destructive)" }}>
                {errors.mediaType.message}
              </span>
            )}
          </div>

          {/* Título opcional */}
          <div className="flex flex-col gap-xs">
            <label
              htmlFor="media-title"
              className="text-sm font-semibold"
              style={{ color: "var(--fg-secondary)" }}
            >
              Título (opcional)
            </label>
            <input
              id="media-title"
              type="text"
              placeholder="Ej. Tutorial técnica sentadilla"
              maxLength={120}
              disabled={isSubmitting}
              {...register("title")}
              className="h-11 px-md rounded-lg text-sm outline-none transition-colors"
              style={{
                background: "var(--fill-tertiary)",
                border: errors.title
                  ? "1px solid var(--destructive)"
                  : "1px solid var(--separator-subtle)",
                color: "var(--fg)",
              }}
            />
            {errors.title && (
              <span className="text-xs" style={{ color: "var(--destructive)" }}>
                {errors.title.message}
              </span>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            iconLeft={isSubmitting ? <Loader2 size={16} className="animate-spin" /> : undefined}
          >
            {isSubmitting ? "Agregando…" : "Agregar link"}
          </Button>
        </form>
      )}
    </div>
  );
};
