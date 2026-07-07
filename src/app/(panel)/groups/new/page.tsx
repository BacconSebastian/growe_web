"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Users } from "lucide-react";
import { GroupForm, type GroupFormValues } from "@/components/groups/GroupForm";
import { SearchInput } from "@/components/ui/SearchInput";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { listStudents, createGroup } from "@/lib/api/coaching";
import type { StudentListItem } from "@/lib/api/coaching";
import { getErrorMessage, getDisplayName, getUserInitials } from "@/lib/utils";
import { useAliases } from "@/contexts/AliasContext";

const SEARCH_THRESHOLD = 8;
const PER_PAGE = 5;

// ─── Skeleton de alumnos ──────────────────────────────────────────────────────

function StudentsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-sm">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-md py-sm">
          <SkeletonCircle size={36} />
          <SkeletonLine width={140} height={14} />
        </div>
      ))}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function NewGroupPage() {
  const router = useRouter();

  const { aliases } = useAliases();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [studentsSearch, setStudentsSearch] = useState("");
  const [studentsPage, setStudentsPage] = useState(1);

  const loadStudents = useCallback(async () => {
    try {
      const res = await listStudents({ page: 1 });
      setStudents(res.items);
    } catch (err) {
      setStudentsError(getErrorMessage(err, "No se pudieron cargar los alumnos"));
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const term = studentsSearch.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        getDisplayName({ ...s, id: s.id }, aliases).toLowerCase().includes(term) ||
        s.username.toLowerCase().includes(term)
    );
  }, [students, studentsSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PER_PAGE));
  const safePage = Math.min(studentsPage, totalPages);
  const pagedStudents = filteredStudents.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );

  const toggleStudent = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (values: GroupFormValues) => {
    setSubmitError(null);
    try {
      const group = await createGroup({
        name: values.name,
        description: values.description || undefined,
        student_ids: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
      });
      router.replace(`/groups/${group.id}`);
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Error al crear el grupo"));
      throw err; // re-throw so GroupForm can reset isSubmitting
    }
  };

  // Slot de alumnos para pasar al GroupForm
  const studentsSlot = (
    <div className="flex flex-col gap-sm">
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--fg-secondary)" }}
      >
        Alumnos (opcional)
      </span>

      <div
        className="rounded-md overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1px solid var(--separator-subtle)",
        }}
      >
        {studentsLoading ? (
          <div className="p-lg">
            <StudentsLoadingSkeleton />
          </div>
        ) : studentsError ? (
          <div className="p-lg">
            <ErrorBanner message={studentsError} />
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-fg-secondary text-center py-xl m-0">
            No tenés alumnos disponibles.
          </p>
        ) : (
          <div className="p-lg flex flex-col gap-sm">
            {students.length > SEARCH_THRESHOLD && (
              <SearchInput
                value={studentsSearch}
                onChange={(v) => { setStudentsSearch(v); setStudentsPage(1); }}
                placeholder="Buscar por nombre..."
                className="mb-sm"
              />
            )}

            {studentsSearch.trim() !== "" && filteredStudents.length === 0 ? (
              <p className="text-sm text-fg-secondary text-center py-md m-0">
                No encontramos resultados para esa búsqueda.
              </p>
            ) : (
              <>
                {pagedStudents.map((student) => {
                  const selected = selectedIds.has(student.id);
                  const initials = getUserInitials(student);
                  const displayName = getDisplayName({ ...student, id: student.id }, aliases);

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className="flex items-center gap-md py-sm px-sm rounded-md text-left transition-colors hover:bg-fill-quaternary w-full"
                      style={{
                        background: selected ? "var(--primary-alpha-08)" : "transparent",
                      }}
                    >
                      <Avatar src={student.avatar_url} initials={initials} size="md" />
                      <span className="flex-1 text-sm font-medium text-fg">{displayName}</span>
                      <div
                        className="w-6 h-6 rounded-pill flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          border: selected
                            ? "2px solid var(--primary)"
                            : "2px solid var(--separator)",
                          background: selected ? "var(--primary)" : "transparent",
                        }}
                      >
                        {selected && <Check size={14} color="var(--on-primary)" />}
                      </div>
                    </button>
                  );
                })}

                {/* Paginación del selector */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-md pt-sm">
                    <span className="text-xs text-fg-tertiary">
                      Pág {safePage} de {totalPages}
                    </span>
                    <div className="flex items-center gap-sm">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}
                        className="px-sm py-xxs rounded-pill text-xs font-medium disabled:opacity-50"
                        style={{ background: "var(--fill-tertiary)", color: "var(--fg)" }}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setStudentsPage((p) => Math.min(totalPages, p + 1))}
                        className="px-sm py-xxs rounded-pill text-xs font-medium disabled:opacity-50"
                        style={{ background: "var(--fill-tertiary)", color: "var(--fg)" }}
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedIds.size > 0 && (
              <p className="text-xs text-fg-tertiary mt-xs m-0">
                {selectedIds.size} {selectedIds.size === 1 ? "alumno seleccionado" : "alumnos seleccionados"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-xl max-w-lg">
      {/* Header */}
      <div>
        <h1
          className="text-display font-bold tracking-tight"
          style={{ margin: 0, letterSpacing: "-0.4px" }}
        >
          Nuevo grupo
        </h1>
        <p className="text-base text-fg-secondary mt-xs m-0">
          Organizá a tus alumnos en un grupo de entrenamiento
        </p>
      </div>

      <GroupForm
        onSubmit={handleSubmit}
        submitLabel="Crear grupo"
        error={submitError}
        extra={studentsSlot}
      />
    </div>
  );
}
