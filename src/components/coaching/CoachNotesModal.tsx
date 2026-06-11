"use client";

/**
 * CoachNotesModal — modal de notas privadas del coach sobre un alumno.
 *
 * Dos tabs:
 *  - "Preguntas": Q&A con soporte de preguntas "default" (aplican a todos los alumnos).
 *  - "Notas": texto libre por alumno.
 *
 * Flujo interno (sin modales hijos para create/edit):
 *  - view === "list": listado normal con Tabs y footer "+ Pregunta" / "+ Nota".
 *  - view === "questionForm": formulario de pregunta; header cambia a back ← + título.
 *  - view === "noteForm": formulario de nota; ídem.
 *
 * Sub-modal para respuestas (AnswerFormModal): modal anidado separado,
 * igual que en el mobile.
 *
 * Constantes de búsqueda/paginación: SEARCH_THRESHOLD = 8, ITEMS_PER_PAGE = 5.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  MessageSquare,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import {
  listStudentQuestions,
  createStudentQuestion,
  updateCoachQuestion,
  deleteCoachQuestion,
  upsertQuestionAnswer,
  deleteQuestionAnswer,
  listStudentNotes,
  createStudentNote,
  updateCoachNote,
  deleteCoachNote,
} from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import type { CoachQuestion, CoachNote } from "@/lib/api/types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const SEARCH_THRESHOLD = 8;
const ITEMS_PER_PAGE = 5;

// ─── Tipos internos ───────────────────────────────────────────────────────────

type Tab = "questions" | "notes";
type ModalView = "list" | "questionForm" | "noteForm";
type FormMode = "create" | "edit";

// ─── Props del componente principal ──────────────────────────────────────────

export interface CoachNotesModalProps {
  open: boolean;
  onClose: () => void;
  studentId: number;
  studentName?: string;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const answerSchema = z.object({
  answer: z
    .string()
    .min(1, "La respuesta es requerida")
    .max(4000, "Máximo 4000 caracteres"),
});
type AnswerFormValues = z.infer<typeof answerSchema>;

const questionSchema = z.object({
  text: z
    .string()
    .min(1, "El texto es requerido")
    .max(500, "Máximo 500 caracteres"),
  is_default: z.boolean(),
  answer: z.string().max(4000, "Máximo 4000 caracteres").optional(),
});
type QuestionFormValues = z.infer<typeof questionSchema>;

const noteSchema = z.object({
  text: z
    .string()
    .min(1, "El texto es requerido")
    .max(4000, "Máximo 4000 caracteres"),
});
type NoteFormValues = z.infer<typeof noteSchema>;

// ─── Helper: formato de fecha relativa ────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;

  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

// ─── Helper: formato fecha + hora ────────────────────────────────────────────

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

// ─── Skeleton de lista ─────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg p-lg flex flex-col gap-sm"
          style={{ background: "var(--fill-tertiary)", border: "1px solid var(--separator-subtle)" }}
        >
          <SkeletonLine width="70%" height={14} />
          <SkeletonLine width="40%" height={11} />
          <SkeletonLine width="55%" height={11} />
        </div>
      ))}
    </div>
  );
}

// ─── AnswerFormModal — sub-modal para responder una pregunta ──────────────────

interface AnswerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: AnswerFormValues) => Promise<void>;
  initialAnswer?: string;
  saving: boolean;
}

function AnswerFormModal({
  open,
  onClose,
  onSave,
  initialAnswer,
  saving,
}: AnswerFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AnswerFormValues>({
    resolver: zodResolver(answerSchema),
    defaultValues: { answer: initialAnswer ?? "" },
  });

  useEffect(() => {
    if (open) {
      reset({ answer: initialAnswer ?? "" });
    }
  }, [open, initialAnswer, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialAnswer ? "Editar respuesta" : "Responder pregunta"}
      size="sm"
      dismissable={!saving}
    >
      <form
        onSubmit={handleSubmit(onSave)}
        className="flex flex-col gap-xl"
      >
        <div className="flex flex-col gap-xs">
          <label className="text-sm font-medium text-fg-secondary">
            Respuesta *
          </label>
          <textarea
            rows={6}
            placeholder="Escribí la respuesta del alumno..."
            className={[
              "w-full bg-fill-tertiary text-fg placeholder-fg-tertiary",
              "border rounded-md text-base outline-none resize-none",
              "transition-colors duration-150 p-md",
              "focus:border-primary focus:bg-fill-quaternary",
              errors.answer ? "border-destructive" : "border-transparent",
            ]
              .filter(Boolean)
              .join(" ")}
            {...register("answer")}
          />
          {errors.answer && (
            <p className="text-xxs text-destructive">{errors.answer.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-sm">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            className="w-full"
          >
            Guardar respuesta
          </Button>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── CoachNotesModal principal ─────────────────────────────────────────────────

export const CoachNotesModal: React.FC<CoachNotesModalProps> = ({
  open,
  onClose,
  studentId,
  studentName,
}) => {
  // ── State machine ──────────────────────────────────────────────────────────
  const [view, setView] = useState<ModalView>("list");
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingQuestion, setEditingQuestion] = useState<CoachQuestion | null>(null);
  const [editingNote, setEditingNote] = useState<CoachNote | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // ── Tab activo ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("questions");

  // ── Búsqueda y paginación ──────────────────────────────────────────────────
  const [questionsSearch, setQuestionsSearch] = useState("");
  const [questionsPage, setQuestionsPage] = useState(1);
  const [notesSearch, setNotesSearch] = useState("");
  const [notesPage, setNotesPage] = useState(1);

  // Reset page cuando se cambia de tab
  useEffect(() => {
    if (activeTab === "questions") {
      setQuestionsPage(1);
    } else {
      setNotesPage(1);
    }
  }, [activeTab]);

  // ── Datos ──────────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<CoachQuestion[]>([]);
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── AnswerFormModal ────────────────────────────────────────────────────────
  const [answerFormOpen, setAnswerFormOpen] = useState(false);
  const [answeringQuestion, setAnsweringQuestion] = useState<CoachQuestion | null>(null);
  const [savingAnswer, setSavingAnswer] = useState(false);

  // ── ConfirmDialog ──────────────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
    confirmVariant?: "danger" | "primary";
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "",
    onConfirm: async () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ── Forms ──────────────────────────────────────────────────────────────────

  const {
    register: registerQuestion,
    handleSubmit: handleQuestionSubmit,
    reset: resetQuestion,
    setValue: setQuestionValue,
    watch: watchQuestion,
    formState: { errors: questionErrors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: { text: "", is_default: false, answer: "" },
  });
  const isDefault = watchQuestion("is_default");

  const {
    register: registerNote,
    handleSubmit: handleNoteSubmit,
    reset: resetNote,
    formState: { errors: noteErrors },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { text: "" },
  });

  // ── Cargar datos ───────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const [qs, ns] = await Promise.all([
        listStudentQuestions(studentId),
        listStudentNotes(studentId),
      ]);
      setQuestions(qs);
      setNotes(ns);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las notas."));
    } finally {
      setLoading(false);
    }
  }, [open, studentId]);

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      // Reset completo al cerrar
      setAnswerFormOpen(false);
      setAnsweringQuestion(null);
      setQuestions([]);
      setNotes([]);
      setError(null);
      setActiveTab("questions");
      setView("list");
      setEditingQuestion(null);
      setEditingNote(null);
      setQuestionsSearch("");
      setQuestionsPage(1);
      setNotesSearch("");
      setNotesPage(1);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navegación entre vistas ────────────────────────────────────────────────

  const openQuestionForm = useCallback(
    (mode: FormMode, question?: CoachQuestion) => {
      setFormMode(mode);
      setEditingQuestion(question ?? null);
      resetQuestion({
        text: question?.text ?? "",
        is_default: question?.is_default ?? false,
        answer: question?.answer?.text ?? "",
      });
      setView("questionForm");
    },
    [resetQuestion],
  );

  const openNoteForm = useCallback(
    (mode: FormMode, note?: CoachNote) => {
      setFormMode(mode);
      setEditingNote(note ?? null);
      resetNote({ text: note?.text ?? "" });
      setView("noteForm");
    },
    [resetNote],
  );

  const backToList = useCallback(() => {
    setEditingQuestion(null);
    setEditingNote(null);
    setView("list");
  }, []);

  // ── Handlers — Guardar pregunta ────────────────────────────────────────────

  const handleSaveQuestion = useCallback(
    async (values: QuestionFormValues) => {
      setSavingQuestion(true);
      try {
        if (formMode === "create") {
          const payload = {
            text: values.text,
            is_default: values.is_default,
            ...(values.answer ? { answer: values.answer } : {}),
          };
          await createStudentQuestion(studentId, payload);
        } else if (editingQuestion) {
          const payload = {
            text: values.text,
            is_default: values.is_default,
            ...(!values.is_default && editingQuestion.is_default
              ? { context_student_id: studentId }
              : {}),
          };
          await updateCoachQuestion(editingQuestion.id, payload);

          // Sincronizar respuesta si cambió
          const previousAnswer = editingQuestion.answer?.text ?? "";
          const newAnswer = (values.answer ?? "").trim();
          if (newAnswer !== previousAnswer.trim()) {
            if (newAnswer) {
              await upsertQuestionAnswer(studentId, editingQuestion.id, {
                answer: newAnswer,
              });
            } else if (editingQuestion.answer) {
              await deleteQuestionAnswer(studentId, editingQuestion.id);
            }
          }
        }
        await loadData();
        backToList();
      } catch (err) {
        setError(getErrorMessage(err, "No se pudo guardar la pregunta."));
      } finally {
        setSavingQuestion(false);
      }
    },
    [formMode, editingQuestion, studentId, loadData, backToList],
  );

  // ── Handlers — Guardar nota ────────────────────────────────────────────────

  const handleSaveNote = useCallback(
    async (values: NoteFormValues) => {
      setSavingNote(true);
      try {
        if (editingNote) {
          await updateCoachNote(editingNote.id, { text: values.text });
        } else {
          await createStudentNote(studentId, { text: values.text });
        }
        await loadData();
        backToList();
      } catch (err) {
        setError(getErrorMessage(err, "No se pudo guardar la nota."));
      } finally {
        setSavingNote(false);
      }
    },
    [editingNote, studentId, loadData, backToList],
  );

  // ── Handlers — Borrar pregunta ─────────────────────────────────────────────

  const handleDeleteQuestion = useCallback(
    (q: CoachQuestion) => {
      // Las preguntas default NO se pueden borrar directamente —
      // aplican a TODOS los alumnos. Solo se puede borrar su respuesta puntual.
      if (q.is_default) {
        if (!q.answer) {
          setConfirmDialog({
            open: true,
            title: "Pregunta predeterminada",
            description:
              'No se puede eliminar una Pregunta predeterminada. Editala y desmarcá la opción "Pregunta predeterminada" para poder borrarla.',
            confirmLabel: "Entendido",
            confirmVariant: "primary",
            onConfirm: async () => {
              setConfirmDialog((prev) => ({ ...prev, open: false }));
            },
          });
          return;
        }
        setConfirmDialog({
          open: true,
          title: "¿Borrar respuesta?",
          description:
            'Esta pregunta es predeterminada. Solo se borrará la respuesta de este alumno. Para eliminar la pregunta, editala y desmarcá "Pregunta predeterminada".',
          confirmLabel: "Borrar respuesta",
          confirmVariant: "danger",
          onConfirm: async () => {
            try {
              await deleteQuestionAnswer(studentId, q.id);
              setQuestions((prev) =>
                prev.map((x) => (x.id === q.id ? { ...x, answer: null } : x)),
              );
            } catch (err) {
              setError(getErrorMessage(err, "No se pudo borrar la respuesta."));
            } finally {
              setConfirmDialog((prev) => ({ ...prev, open: false }));
            }
          },
        });
        return;
      }

      // Pregunta no-default: borrar normalmente
      setConfirmDialog({
        open: true,
        title: "¿Eliminar pregunta?",
        description: "Esta pregunta será eliminada permanentemente.",
        confirmLabel: "Eliminar",
        confirmVariant: "danger",
        onConfirm: async () => {
          try {
            await deleteCoachQuestion(q.id);
            setQuestions((prev) => prev.filter((x) => x.id !== q.id));
          } catch (err) {
            setError(getErrorMessage(err, "No se pudo eliminar la pregunta."));
          } finally {
            setConfirmDialog((prev) => ({ ...prev, open: false }));
          }
        },
      });
    },
    [studentId],
  );

  // ── Handlers — Borrar nota ─────────────────────────────────────────────────

  const handleDeleteNote = useCallback((note: CoachNote) => {
    setConfirmDialog({
      open: true,
      title: "¿Eliminar nota?",
      description: "La nota será eliminada permanentemente.",
      confirmLabel: "Eliminar",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await deleteCoachNote(note.id);
          setNotes((prev) => prev.filter((n) => n.id !== note.id));
        } catch (err) {
          setError(getErrorMessage(err, "No se pudo eliminar la nota."));
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }, []);

  // ── Handlers — Respuestas ──────────────────────────────────────────────────

  const handleOpenAnswer = useCallback((q: CoachQuestion) => {
    setAnsweringQuestion(q);
    setAnswerFormOpen(true);
  }, []);

  const handleSaveAnswer = useCallback(
    async (values: AnswerFormValues) => {
      if (!answeringQuestion) return;
      setSavingAnswer(true);
      try {
        const result = await upsertQuestionAnswer(studentId, answeringQuestion.id, {
          answer: values.answer,
        });
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === answeringQuestion.id ? { ...q, answer: result } : q,
          ),
        );
        setAnswerFormOpen(false);
        setAnsweringQuestion(null);
      } catch (err) {
        setError(getErrorMessage(err, "No se pudo guardar la respuesta."));
      } finally {
        setSavingAnswer(false);
      }
    },
    [answeringQuestion, studentId],
  );

  const handleDeleteAnswer = useCallback(
    (q: CoachQuestion) => {
      setConfirmDialog({
        open: true,
        title: "¿Borrar respuesta?",
        description: "La respuesta será eliminada.",
        confirmLabel: "Borrar",
        confirmVariant: "danger",
        onConfirm: async () => {
          try {
            await deleteQuestionAnswer(studentId, q.id);
            setQuestions((prev) =>
              prev.map((x) => (x.id === q.id ? { ...x, answer: null } : x)),
            );
          } catch (err) {
            setError(getErrorMessage(err, "No se pudo borrar la respuesta."));
          } finally {
            setConfirmDialog((prev) => ({ ...prev, open: false }));
          }
        },
      });
    },
    [studentId],
  );

  // ── Header dinámico ────────────────────────────────────────────────────────

  const modalTitle = useMemo(() => {
    if (view === "questionForm") {
      return formMode === "create" ? "Nueva pregunta" : "Editar pregunta";
    }
    if (view === "noteForm") {
      return formMode === "create" ? "Nueva nota" : "Editar nota";
    }
    return "Notas";
  }, [view, formMode]);

  // ── Filtrado de preguntas ──────────────────────────────────────────────────

  const filteredQuestions = useMemo(() => {
    const term = questionsSearch.trim().toLowerCase();
    if (!term) return questions;
    return questions.filter((q) => q.text.toLowerCase().includes(term));
  }, [questions, questionsSearch]);

  const questionsTotalPages = Math.max(1, Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE));
  const questionsSafePage = Math.min(questionsPage, questionsTotalPages);
  const pagedQuestions = filteredQuestions.slice(
    (questionsSafePage - 1) * ITEMS_PER_PAGE,
    questionsSafePage * ITEMS_PER_PAGE,
  );

  // ── Filtrado de notas ──────────────────────────────────────────────────────

  const filteredNotes = useMemo(() => {
    const term = notesSearch.trim().toLowerCase();
    if (!term) return notes;
    return notes.filter((n) => n.text.toLowerCase().includes(term));
  }, [notes, notesSearch]);

  const notesTotalPages = Math.max(1, Math.ceil(filteredNotes.length / ITEMS_PER_PAGE));
  const notesSafePage = Math.min(notesPage, notesTotalPages);
  const pagedNotes = filteredNotes.slice(
    (notesSafePage - 1) * ITEMS_PER_PAGE,
    notesSafePage * ITEMS_PER_PAGE,
  );

  // ── Ejecutar confirmación ──────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
    } finally {
      setConfirmLoading(false);
    }
  }, [confirmDialog]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Modal
        open={open}
        onClose={view === "list" ? onClose : backToList}
        title={modalTitle}
        size="md"
        dismissable={view === "list"}
      >
        {/* Subtítulo del alumno en vista lista */}
        {view === "list" && studentName && (
          <p
            className="text-sm text-fg-secondary -mt-sm mb-lg m-0"
            style={{ marginTop: "-0.5rem", marginBottom: "1rem" }}
          >
            {studentName}
          </p>
        )}

        {/* Botón back cuando no estamos en la lista */}
        {view !== "list" && (
          <button
            type="button"
            onClick={backToList}
            className="flex items-center gap-xs text-sm text-fg-secondary hover:text-fg transition-colors mb-lg"
            style={{ marginBottom: "1rem" }}
          >
            <ArrowLeft size={16} />
            Volver
          </button>
        )}

        {/* Error global */}
        {error && (
          <ErrorBanner
            message={error}
            dismissible
            className="mb-lg"
          />
        )}

        {/* ── Vista: listado ──────────────────────────────────────────────── */}
        {view === "list" && (
          <div className="flex flex-col gap-xl">
            <Tabs
              tabs={[
                { id: "questions", label: "Preguntas" },
                { id: "notes", label: "Notas" },
              ]}
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as Tab)}
            />

            {loading ? (
              <ListSkeleton />
            ) : activeTab === "questions" ? (
              /* ── Tab Preguntas ─────────────────────────────────────────── */
              <div className="flex flex-col gap-md">
                {questions.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare size={24} />}
                    title="Sin preguntas"
                    description="Creá preguntas para hacer seguimiento de tus alumnos."
                  />
                ) : (
                  <>
                    {questions.length > SEARCH_THRESHOLD && (
                      <SearchInput
                        value={questionsSearch}
                        onChange={(v) => {
                          setQuestionsSearch(v);
                          setQuestionsPage(1);
                        }}
                        placeholder="Buscar pregunta..."
                      />
                    )}

                    {questionsSearch.trim() !== "" && filteredQuestions.length === 0 ? (
                      <p className="text-sm text-fg-secondary text-center py-lg">
                        No encontramos resultados para esa búsqueda.
                      </p>
                    ) : (
                      <>
                        {pagedQuestions.map((q) => (
                          <QuestionCard
                            key={q.id}
                            question={q}
                            onEdit={() => openQuestionForm("edit", q)}
                            onDelete={() => handleDeleteQuestion(q)}
                            onAnswer={() => handleOpenAnswer(q)}
                            onDeleteAnswer={() => handleDeleteAnswer(q)}
                          />
                        ))}
                      </>
                    )}

                    {filteredQuestions.length > ITEMS_PER_PAGE && (
                      <Pagination
                        page={questionsSafePage}
                        perPage={ITEMS_PER_PAGE}
                        total={filteredQuestions.length}
                        onPageChange={setQuestionsPage}
                      />
                    )}
                  </>
                )}

                <div
                  className="pt-lg"
                  style={{ borderTop: "1px solid var(--separator-subtle)" }}
                >
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => openQuestionForm("create")}
                    iconLeft={<Plus size={16} />}
                  >
                    Agregar pregunta
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Tab Notas ─────────────────────────────────────────────── */
              <div className="flex flex-col gap-md">
                {notes.length === 0 ? (
                  <EmptyState
                    icon={<NotebookPen size={24} />}
                    title="Sin notas"
                    description="Guardá observaciones privadas sobre este alumno."
                  />
                ) : (
                  <>
                    {notes.length > SEARCH_THRESHOLD && (
                      <SearchInput
                        value={notesSearch}
                        onChange={(v) => {
                          setNotesSearch(v);
                          setNotesPage(1);
                        }}
                        placeholder="Buscar nota..."
                      />
                    )}

                    {notesSearch.trim() !== "" && filteredNotes.length === 0 ? (
                      <p className="text-sm text-fg-secondary text-center py-lg">
                        No encontramos resultados para esa búsqueda.
                      </p>
                    ) : (
                      <>
                        {pagedNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            onEdit={() => openNoteForm("edit", note)}
                            onDelete={() => handleDeleteNote(note)}
                          />
                        ))}
                      </>
                    )}

                    {filteredNotes.length > ITEMS_PER_PAGE && (
                      <Pagination
                        page={notesSafePage}
                        perPage={ITEMS_PER_PAGE}
                        total={filteredNotes.length}
                        onPageChange={setNotesPage}
                      />
                    )}
                  </>
                )}

                <div
                  className="pt-lg"
                  style={{ borderTop: "1px solid var(--separator-subtle)" }}
                >
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => openNoteForm("create")}
                    iconLeft={<Plus size={16} />}
                  >
                    Agregar nota
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Vista: formulario de pregunta ──────────────────────────────── */}
        {view === "questionForm" && (
          <form
            onSubmit={handleQuestionSubmit(handleSaveQuestion)}
            className="flex flex-col gap-xl"
          >
            {/* Texto de la pregunta */}
            <div className="flex flex-col gap-xs">
              <label className="text-sm font-medium text-fg-secondary">
                Pregunta *
              </label>
              <textarea
                rows={4}
                placeholder="Ej: ¿Cómo te sentiste con la carga de esta semana?"
                className={[
                  "w-full bg-fill-tertiary text-fg placeholder-fg-tertiary",
                  "border rounded-md text-base outline-none resize-none",
                  "transition-colors duration-150 p-md",
                  "focus:border-primary focus:bg-fill-quaternary",
                  questionErrors.text ? "border-destructive" : "border-transparent",
                ]
                  .filter(Boolean)
                  .join(" ")}
                {...registerQuestion("text")}
              />
              {questionErrors.text && (
                <p className="text-xxs text-destructive">
                  {questionErrors.text.message}
                </p>
              )}
            </div>

            {/* Respuesta inicial — opcional */}
            <div className="flex flex-col gap-xs">
              <label className="text-sm font-medium text-fg-secondary">
                Respuesta — opcional
              </label>
              <textarea
                rows={5}
                placeholder="Podés responder ahora o más tarde"
                className={[
                  "w-full bg-fill-tertiary text-fg placeholder-fg-tertiary",
                  "border rounded-md text-base outline-none resize-none",
                  "transition-colors duration-150 p-md",
                  "focus:border-primary focus:bg-fill-quaternary",
                  questionErrors.answer ? "border-destructive" : "border-transparent",
                ]
                  .filter(Boolean)
                  .join(" ")}
                {...registerQuestion("answer")}
              />
              {questionErrors.answer && (
                <p className="text-xxs text-destructive">
                  {questionErrors.answer.message}
                </p>
              )}
            </div>

            {/* Switch predeterminada */}
            <div
              className="flex items-start gap-lg p-md rounded-md"
              style={{ background: "var(--fill-tertiary)" }}
            >
              <div className="flex flex-col gap-xs flex-1">
                <span className="text-base font-medium text-fg">
                  Pregunta predeterminada
                </span>
                <span className="text-sm text-fg-secondary">
                  Aparece automáticamente en las notas de todos tus alumnos
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isDefault}
                onClick={() => setQuestionValue("is_default", !isDefault)}
                className={[
                  "relative inline-flex h-6 w-11 flex-shrink-0 rounded-pill transition-colors duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isDefault ? "bg-primary" : "bg-fill-secondary",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span
                  className={[
                    "inline-block h-5 w-5 transform rounded-pill bg-white shadow transition-transform duration-200 mt-px",
                    isDefault ? "translate-x-5" : "translate-x-px",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </button>
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-sm">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={savingQuestion}
                className="w-full"
              >
                {formMode === "create" ? "Crear pregunta" : "Guardar cambios"}
              </Button>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={savingQuestion}
                  onClick={backToList}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* ── Vista: formulario de nota ──────────────────────────────────── */}
        {view === "noteForm" && (
          <form
            onSubmit={handleNoteSubmit(handleSaveNote)}
            className="flex flex-col gap-xl"
          >
            <div className="flex flex-col gap-xs">
              <label className="text-sm font-medium text-fg-secondary">
                Nota *
              </label>
              <textarea
                rows={7}
                placeholder="Ej: Tiene molestia en hombro derecho, evitar press militar por ahora."
                className={[
                  "w-full bg-fill-tertiary text-fg placeholder-fg-tertiary",
                  "border rounded-md text-base outline-none resize-none",
                  "transition-colors duration-150 p-md",
                  "focus:border-primary focus:bg-fill-quaternary",
                  noteErrors.text ? "border-destructive" : "border-transparent",
                ]
                  .filter(Boolean)
                  .join(" ")}
                {...registerNote("text")}
              />
              {noteErrors.text && (
                <p className="text-xxs text-destructive">
                  {noteErrors.text.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-sm">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={savingNote}
                className="w-full"
              >
                {formMode === "create" ? "Crear nota" : "Guardar cambios"}
              </Button>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={savingNote}
                  onClick={backToList}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* AnswerFormModal — sub-modal para respuestas */}
      <AnswerFormModal
        open={answerFormOpen}
        onClose={() => {
          setAnswerFormOpen(false);
          setAnsweringQuestion(null);
        }}
        onSave={handleSaveAnswer}
        initialAnswer={answeringQuestion?.answer?.text}
        saving={savingAnswer}
      />

      {/* ConfirmDialog — para borrados */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.confirmVariant ?? "danger"}
        onConfirm={handleConfirm}
        onClose={() =>
          setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
        loading={confirmLoading}
      />
    </>
  );
};

// ─── QuestionCard ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: CoachQuestion;
  onEdit: () => void;
  onDelete: () => void;
  onAnswer: () => void;
  onDeleteAnswer: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onEdit,
  onDelete,
  onAnswer,
  onDeleteAnswer,
}) => {
  return (
    <div
      className="rounded-lg p-lg flex flex-col gap-sm"
      style={{
        background: "var(--fill-tertiary)",
        border: question.is_default
          ? "1px solid var(--primary-alpha-40)"
          : "1px solid var(--separator-subtle)",
      }}
    >
      {/* Header: texto + acciones */}
      <div className="flex items-start justify-between gap-md">
        <div className="flex-1 flex flex-col gap-xs min-w-0">
          {question.is_default && (
            <span
              className="text-xxs font-semibold uppercase tracking-wide"
              style={{ color: "var(--primary)" }}
            >
              Predeterminada
            </span>
          )}
          <p className="text-base font-semibold text-fg m-0 leading-snug">
            {question.text}
          </p>
        </div>

        {/* Botones de acción — círculares */}
        <div className="flex items-center gap-xs flex-shrink-0 -mt-xs">
          <button
            type="button"
            onClick={onEdit}
            title="Editar pregunta"
            className="w-8 h-8 rounded-pill flex items-center justify-center transition-colors"
            style={{ background: "var(--primary-alpha-12)", color: "var(--primary)" }}
            aria-label="Editar pregunta"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Eliminar pregunta"
            className="w-8 h-8 rounded-pill flex items-center justify-center transition-colors"
            style={{
              background: "var(--destructive-alpha-12)",
              color: "var(--destructive)",
            }}
            aria-label="Eliminar pregunta"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Respuesta existente */}
      {question.answer ? (
        <div
          className="rounded-md p-md flex flex-col gap-xs"
          style={{ background: "var(--fill-secondary)" }}
        >
          <p className="text-base text-fg m-0 leading-snug">{question.answer.text}</p>
          <div className="flex items-center justify-between gap-md">
            <span className="text-xxs text-fg-secondary">
              {formatDateTime(question.answer.updated_at)}
            </span>
            <div className="flex items-center gap-xs">
              <button
                type="button"
                onClick={onAnswer}
                className="text-xs font-medium transition-colors"
                style={{ color: "var(--primary)" }}
                aria-label="Editar respuesta"
              >
                Editar
              </button>
              <span className="text-fg-tertiary text-xxs">·</span>
              <button
                type="button"
                onClick={onDeleteAnswer}
                className="text-xs font-medium transition-colors"
                style={{ color: "var(--destructive)" }}
                aria-label="Borrar respuesta"
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAnswer}
          className="self-start text-sm font-medium transition-colors"
          style={{ color: "var(--primary)" }}
        >
          + Responder
        </button>
      )}
    </div>
  );
};

// ─── NoteCard ─────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: CoachNote;
  onEdit: () => void;
  onDelete: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete }) => {
  return (
    <div
      className="rounded-lg p-lg flex flex-col gap-sm"
      style={{
        background: "var(--fill-tertiary)",
        border: "1px solid var(--separator-subtle)",
      }}
    >
      <div className="flex items-start justify-between gap-md">
        <p className="text-base font-medium text-fg m-0 leading-snug flex-1 min-w-0">
          {note.text}
        </p>

        {/* Botones de acción — circulares */}
        <div className="flex items-center gap-xs flex-shrink-0 -mt-xs">
          <button
            type="button"
            onClick={onEdit}
            title="Editar nota"
            className="w-8 h-8 rounded-pill flex items-center justify-center transition-colors"
            style={{ background: "var(--primary-alpha-12)", color: "var(--primary)" }}
            aria-label="Editar nota"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Eliminar nota"
            className="w-8 h-8 rounded-pill flex items-center justify-center transition-colors"
            style={{
              background: "var(--destructive-alpha-12)",
              color: "var(--destructive)",
            }}
            aria-label="Eliminar nota"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <span className="text-xxs text-fg-secondary">
        {formatRelativeDate(note.updated_at ?? note.created_at)}
      </span>
    </div>
  );
};
