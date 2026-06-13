"use client";

/**
 * ExerciseGalleryModal — galería de medios de un ejercicio del catálogo.
 *
 * Estados internos:
 *  - "grid"    → muestra las cards (siempre ≥ 3 slots; vacíos con borde punteado)
 *  - "viewer"  → visor in-app para el item seleccionado (sin window.open)
 *  - "add"     → sub-panel de alta (subir archivo o agregar link)
 *
 * Límites:
 *  - Máx 3 media por ejercicio (no muestra slot de alta cuando ya hay 3)
 *  - Videos: YouTube → iframe embed; CDN → <video controls>; otros → iframe externalUrl
 *  - Imágenes: <img> con object-contain
 *  - NADA redirige al usuario a un link externo
 */

import React, { useCallback, useEffect, useState } from "react";
import { Images, ImagePlus, Play, ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getExerciseMedia, deleteExerciseMedia } from "@/lib/api/exercise-media";
import { getErrorMessage } from "@/lib/utils";
import { AddExerciseMediaPanel } from "./AddExerciseMediaPanel";
import type { ExerciseMedia } from "@/lib/api/types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_MEDIA = 3;
const MIN_GRID_SLOTS = 3;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExerciseGalleryModalProps {
  open: boolean;
  onClose: () => void;
  /** exercise_id de catálogo */
  exerciseId: number;
  exerciseName: string;
}

// ─── Tipo de vista interna ────────────────────────────────────────────────────

type ModalView = "grid" | "viewer" | "add";

// ─── Componente principal ─────────────────────────────────────────────────────

export const ExerciseGalleryModal: React.FC<ExerciseGalleryModalProps> = ({
  open,
  onClose,
  exerciseId,
  exerciseName,
}) => {
  const [media, setMedia] = useState<ExerciseMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<ModalView>("grid");
  const [selected, setSelected] = useState<ExerciseMedia | null>(null);

  const [pendingDelete, setPendingDelete] = useState<ExerciseMedia | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch media ────────────────────────────────────────────────────────────

  const fetchMedia = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const items = await getExerciseMedia(exerciseId);
      const visible = items.filter(
        (m) => m.status === "ready" || m.sourceType === "external_link"
      );
      setMedia(visible);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar la galería."));
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    if (!open) return;
    setView("grid");
    setSelected(null);
    fetchMedia();
  }, [open, fetchMedia]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleThumbClick = (item: ExerciseMedia) => {
    setSelected(item);
    setView("viewer");
  };

  const handleEmptySlotClick = () => {
    setView("add");
  };

  const handleAddSuccess = () => {
    setView("grid");
    fetchMedia();
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteExerciseMedia(exerciseId, pendingDelete.id);
      setPendingDelete(null);
      fetchMedia();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar el media."));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Título del modal (según vista) ────────────────────────────────────────

  const modalTitle =
    view === "add"
      ? `Agregar media — ${exerciseName}`
      : view === "viewer" && selected
      ? (selected.title ?? exerciseName)
      : `Galería — ${exerciseName}`;

  // ─── Grid slots: siempre al menos MIN_GRID_SLOTS ───────────────────────────

  const slotCount = Math.max(MIN_GRID_SLOTS, media.length);
  const canAdd = media.length < MAX_MEDIA;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Modal open={open} onClose={onClose} title={modalTitle} size="lg">
        {/* ── Vista: cargando ── */}
        {loading && view === "grid" ? (
          <div className="flex items-center justify-center py-xxl text-fg-tertiary gap-sm">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--primary)" }} />
            <span className="text-sm">Cargando galería…</span>
          </div>
        ) : error ? (
          /* ── Vista: error ── */
          <div
            className="p-md rounded-md text-sm"
            style={{
              background: "var(--destructive-alpha-12)",
              color: "var(--destructive)",
            }}
          >
            {error}
          </div>
        ) : view === "add" ? (
          /* ── Vista: alta de media ── */
          <AddExerciseMediaPanel
            exerciseId={exerciseId}
            onBack={() => setView("grid")}
            onSuccess={handleAddSuccess}
          />
        ) : view === "viewer" && selected ? (
          /* ── Vista: visor in-app ── */
          <ViewerPanel
            item={selected}
            exerciseName={exerciseName}
            onBack={() => {
              setSelected(null);
              setView("grid");
            }}
            onDelete={() => {
              setPendingDelete(selected);
            }}
          />
        ) : (
          /* ── Vista: grid ── */
          <div className="flex flex-col gap-lg">
            {/* Aviso de límite */}
            {!canAdd && (
              <p
                className="text-sm text-center m-0"
                style={{ color: "var(--fg-tertiary)" }}
              >
                Máximo {MAX_MEDIA} archivos por ejercicio.
              </p>
            )}

            {/* Grid de 3 columnas */}
            <div
              className="grid gap-md"
              style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
            >
              {Array.from({ length: slotCount }, (_, i) => {
                const item = media[i];
                if (item) {
                  return (
                    <MediaThumb
                      key={item.id}
                      item={item}
                      onClick={() => handleThumbClick(item)}
                    />
                  );
                }
                // Slot vacío
                return (
                  <EmptySlot
                    key={`empty-${i}`}
                    onClick={canAdd ? handleEmptySlotClick : undefined}
                    disabled={!canAdd}
                  />
                );
              })}
            </div>

            {/* Botón de agregar explícito si ya hay media pero aún queda cupo */}
            {media.length > 0 && canAdd && (
              <Button
                type="button"
                variant="primarySoft"
                size="md"
                iconLeft={<ImagePlus size={16} />}
                onClick={() => setView("add")}
              >
                Agregar imagen o video
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Dialog de confirmación de borrado (fuera del Modal para evitar nesting de dialogs) */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar media"
        description={`¿Eliminar "${pendingDelete?.title ?? (pendingDelete?.mediaType === "video" ? "este video" : "esta imagen")}" de la galería? Esta acción no se puede deshacer.`}
        confirmLabel={deleting ? "Eliminando…" : "Eliminar"}
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
};

// ─── MediaThumb ───────────────────────────────────────────────────────────────

interface MediaThumbProps {
  item: ExerciseMedia;
  onClick: () => void;
}

const MediaThumb: React.FC<MediaThumbProps> = ({ item, onClick }) => {
  const isVideo = item.mediaType === "video";

  const imageSrc = (() => {
    if (item.mediaType === "image") {
      return item.cdnUrl ?? item.thumbnailUrl ?? item.externalUrl ?? null;
    }
    // Video thumbnail
    if (item.thumbnailUrl) return item.thumbnailUrl;
    if (item.externalProvider === "youtube" && item.externalVideoId) {
      return `https://img.youtube.com/vi/${item.externalVideoId}/hqdefault.jpg`;
    }
    return null;
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-lg overflow-hidden transition-all hover:scale-[1.02] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2"
      style={{
        aspectRatio: "4/3",
        background: "var(--bg-secondary)",
        border: "1px solid var(--separator-subtle)",
        cursor: "pointer",
      }}
      aria-label={item.title ?? (isVideo ? "Ver video" : "Ver imagen")}
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={item.title ?? ""}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ color: "var(--fg-tertiary)" }}
        >
          <Images size={24} className="opacity-40" />
        </div>
      )}

      {/* Overlay de play para videos */}
      {isVideo && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "var(--overlay-video-scrim)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "var(--overlay-play-bg)" }}
          >
            <Play size={18} className="text-white" style={{ marginLeft: "2px" }} />
          </div>
        </div>
      )}

      {/* Label */}
      {item.title && (
        <div
          className="absolute bottom-0 left-0 right-0 px-xs py-xxs text-xs truncate"
          style={{
            background: "var(--overlay-label-bg)",
            color: "var(--overlay-label-fg)",
          }}
        >
          {item.title}
        </div>
      )}
    </button>
  );
};

// ─── EmptySlot ────────────────────────────────────────────────────────────────

interface EmptySlotProps {
  onClick?: () => void;
  disabled?: boolean;
}

const EmptySlot: React.FC<EmptySlotProps> = ({ onClick, disabled = false }) => {
  const sharedStyle: React.CSSProperties = {
    aspectRatio: "4/3",
    border: "1.5px dashed var(--separator)",
    background: "transparent",
    cursor: onClick && !disabled ? "pointer" : "default",
    opacity: disabled ? 0.4 : 1,
  };

  const sharedClassName =
    "relative rounded-lg flex flex-col items-center justify-center gap-sm transition-opacity focus-visible:outline-none";

  const inner = (
    <>
      <ImagePlus size={22} style={{ color: "var(--fg-tertiary)" }} />
      {!disabled && (
        <span className="text-xs text-center px-sm" style={{ color: "var(--fg-secondary)" }}>
          Agregar imagen o video
        </span>
      )}
    </>
  );

  if (onClick && !disabled) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={sharedClassName}
        style={sharedStyle}
        aria-label="Agregar imagen o video"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={sharedClassName} style={sharedStyle}>
      {inner}
    </div>
  );
};

// ─── Helpers de embed para videos externos ────────────────────────────────────

function extractYouTubeId(url: string | null): string | null {
  if (!url) return null;
  const m =
    url.match(/[?&]v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?&/]+)/) ||
    url.match(/\/embed\/([^?&/]+)/) ||
    url.match(/\/shorts\/([^?&/]+)/);
  return m ? m[1] : null;
}

function extractDriveId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  return m ? m[1] : null;
}

function extractTikTokId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/video\/(\d+)/) || url.match(/\/v\/(\d+)/);
  return m ? m[1] : null;
}

/**
 * Construye la URL de embed correcta según el provider externo.
 * Devuelve null si no es un provider embebible conocido.
 */
function buildVideoEmbedSrc(item: ExerciseMedia): string | null {
  if (item.externalProvider === "youtube") {
    const id = item.externalVideoId ?? extractYouTubeId(item.externalUrl);
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
  }
  if (item.externalProvider === "drive") {
    const id = extractDriveId(item.externalUrl);
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  }
  if (item.externalProvider === "tiktok") {
    const id = item.externalVideoId ?? extractTikTokId(item.externalUrl);
    if (id) return `https://www.tiktok.com/embed/v2/${id}`;
  }
  return null;
}

// ─── ViewerPanel ──────────────────────────────────────────────────────────────

interface ViewerPanelProps {
  item: ExerciseMedia;
  exerciseName: string;
  onBack: () => void;
  onDelete: () => void;
}

const ViewerPanel: React.FC<ViewerPanelProps> = ({
  item,
  exerciseName,
  onBack,
  onDelete,
}) => {
  const isVideo = item.mediaType === "video";

  // Determinar el embed a usar para videos
  const videoContent = (() => {
    if (!isVideo) return null;

    // 1) Embed correcto según provider (YouTube, Drive /preview, TikTok embed)
    const embedSrc = buildVideoEmbedSrc(item);
    if (embedSrc) {
      return (
        <iframe
          src={embedSrc}
          title={item.title ?? exerciseName}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="w-full h-full border-0"
        />
      );
    }

    // 2) Video subido (S3)
    if (item.cdnUrl) {
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={item.cdnUrl}
          controls
          autoPlay
          className="w-full h-full object-contain"
        />
      );
    }

    // 3) Sin forma de embeber → mensaje (no redirigimos automáticamente)
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-sm px-lg text-center"
        style={{ color: "var(--fg-tertiary)" }}
      >
        <span className="text-sm">No se puede previsualizar este video acá.</span>
        {item.externalUrl && (
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium"
            style={{ color: "var(--primary)" }}
          >
            Abrir en una pestaña nueva
          </a>
        )}
      </div>
    );
  })();

  const imageSrc = !isVideo
    ? (item.cdnUrl ?? item.thumbnailUrl ?? item.externalUrl ?? null)
    : null;

  return (
    <div className="flex flex-col gap-lg">
      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-xs text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--primary)" }}
        >
          <ArrowLeft size={16} />
          Volver a la galería
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-xs text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--destructive)" }}
          title="Eliminar media"
          aria-label="Eliminar media"
        >
          <Trash2 size={15} />
          Eliminar
        </button>
      </div>

      {/* Visor */}
      <div
        className="w-full rounded-lg overflow-hidden"
        style={{
          aspectRatio: isVideo ? "16/9" : undefined,
          background: "var(--bg-secondary)",
          ...(isVideo ? {} : { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "240px" }),
        }}
      >
        {isVideo ? (
          videoContent
        ) : imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={item.title ?? exerciseName}
            style={{ maxWidth: "100%", maxHeight: "480px", objectFit: "contain" }}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-sm py-xxl"
            style={{ color: "var(--fg-tertiary)" }}
          >
            <Images size={32} className="opacity-40" />
            <span className="text-sm">Vista previa no disponible</span>
          </div>
        )}
      </div>

      {/* Metadata */}
      {(item.title || item.durationSeconds != null) && (
        <div className="flex flex-col gap-xxs">
          {item.title && (
            <span className="text-sm font-semibold text-fg">{item.title}</span>
          )}
          {item.durationSeconds != null && (
            <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
              Duración: {Math.floor(item.durationSeconds / 60)}:{String(item.durationSeconds % 60).padStart(2, "0")}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
