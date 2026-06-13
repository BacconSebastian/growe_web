"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, Trash2, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  getExerciseComments,
  createExerciseComment,
  markExerciseCommentsRead,
  deleteExerciseComment,
} from "@/lib/api/comments";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { ExerciseComment } from "@/lib/api/types";

interface ExerciseCommentsModalProps {
  open: boolean;
  onClose: () => void;
  /** routine_exercise_id */
  routineExerciseId: number;
  exerciseName: string;
}

const commentSchema = z.object({
  content: z.string().min(1, "El comentario no puede estar vacío").max(500),
});
type CommentFormValues = z.infer<typeof commentSchema>;

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "hace un momento";
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days} d`;
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

/**
 * ExerciseCommentsModal — lista y crea comentarios de un RoutineExercise.
 * Carga al abrir, marca como leídos (fire-and-forget), permite crear y eliminar
 * los propios.
 */
export const ExerciseCommentsModal: React.FC<ExerciseCommentsModalProps> = ({
  open,
  onClose,
  routineExerciseId,
  exerciseName,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<ExerciseComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const { register, handleSubmit, reset, watch } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
  });

  const contentValue = watch("content") ?? "";
  const canSubmit = contentValue.trim().length > 0;

  // Carga al abrir
  useEffect(() => {
    if (!open) return;
    setLoadError(null);
    setLoading(true);

    getExerciseComments(routineExerciseId)
      .then((data) => {
        setComments(data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      })
      .catch((err) => {
        setLoadError(getErrorMessage(err, "No se pudieron cargar los comentarios."));
      })
      .finally(() => setLoading(false));

    // fire-and-forget
    markExerciseCommentsRead(routineExerciseId).catch(() => undefined);
  }, [open, routineExerciseId]);

  // Scroll al final cuando llegan comentarios nuevos
  useEffect(() => {
    if (comments.length > 0) {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const newComment = await createExerciseComment(routineExerciseId, values.content.trim());
      setComments((prev) => [...prev, newComment]);
      reset();
      if (textareaRef.current) textareaRef.current.style.height = "";
    } catch (err) {
      setLoadError(getErrorMessage(err, "No se pudo enviar el comentario."));
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await deleteExerciseComment(deleteId);
      setComments((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "No se pudo eliminar el comentario."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Comentarios — ${exerciseName}`} size="md">
        <div className="flex flex-col" style={{ height: "min(70vh, 480px)" }}>
          {/* Lista (scrollable) */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="h-full flex items-center justify-center py-xl">
                <span className="text-sm text-fg-tertiary">
                  Cargando comentarios...
                </span>
              </div>
            ) : comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-sm py-xl text-fg-tertiary">
                <MessageCircle size={32} className="opacity-40" />
                <span className="text-sm">Sin comentarios aún</span>
              </div>
            ) : (
              <div className="flex flex-col gap-md">
                {comments.map((comment) => {
                  const isOwn = user?.id === comment.user_id;
                  return (
                    <div
                      key={comment.id}
                      className="flex gap-sm p-md rounded-lg"
                      style={{
                        background: "var(--fill-tertiary)",
                        border: "1px solid var(--separator-subtle)",
                      }}
                    >
                      <Avatar
                        src={comment.author.avatar_url}
                        initials={comment.author.username.slice(0, 2)}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-sm mb-xxs">
                          <div className="flex items-center gap-xs">
                            <span className="text-sm font-semibold text-fg">
                              {comment.author.username}
                            </span>
                            {formatRelativeTime(comment.createdAt) && (
                              <span className="text-xs text-fg-tertiary">
                                {formatRelativeTime(comment.createdAt)}
                              </span>
                            )}
                          </div>
                          {isOwn && (
                            <button
                              type="button"
                              onClick={() => setDeleteId(comment.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-pill flex-shrink-0 transition-colors hover:opacity-80"
                              style={{
                                background: "var(--destructive-alpha-12)",
                                color: "var(--destructive)",
                              }}
                              aria-label="Eliminar comentario"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <p
                          className="text-sm text-fg-secondary m-0"
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={listEndRef} />
              </div>
            )}
          </div>

          {/* Error (carga o envío) */}
          {loadError && !loading && (
            <p className="text-xs text-destructive m-0 mt-sm">{loadError}</p>
          )}

          {/* Nuevo comentario — fijo abajo (sin <form> para no anidar en el form de la rutina) */}
          <div
            className="flex-shrink-0 flex gap-sm items-end pt-md mt-md"
            style={{ borderTop: "1px solid var(--separator-subtle)" }}
          >
            {(() => {
              const contentReg = register("content");
              return (
                <textarea
                  {...contentReg}
                  ref={(el) => {
                    contentReg.ref(el);
                    textareaRef.current = el;
                  }}
                  placeholder="Escribí un comentario..."
                  rows={1}
                  className="flex-1 resize-none text-fg placeholder-fg-tertiary outline-none transition-colors text-sm rounded-md px-sm py-xs border leading-tight"
                  style={{
                    background: "var(--fill-tertiary)",
                    maxHeight: "140px",
                    borderColor: "transparent",
                  }}
                  onInput={(e) => autoGrow(e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (canSubmit) void onSubmit();
                    }
                  }}
                />
              );
            })()}
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!canSubmit || submitting}
              loading={submitting}
              onClick={() => void onSubmit()}
              iconLeft={<Send size={14} />}
            >
              Enviar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar comentario"
        description="¿Seguro que querés eliminar este comentario?"
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </>
  );
};
