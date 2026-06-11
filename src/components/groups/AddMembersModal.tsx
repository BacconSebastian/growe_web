"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";
import { listStudents, addGroupMembers } from "@/lib/api/coaching";
import type { StudentListItem } from "@/lib/api/coaching";
import { getErrorMessage, getDisplayName, getUserInitials } from "@/lib/utils";

const SEARCH_THRESHOLD = 8;
const PER_PAGE = 5;

interface AddMembersModalProps {
  open: boolean;
  onClose: () => void;
  groupId: number;
  currentMemberIds: number[];
  onAdded: () => void;
}

function StudentRowSkeleton() {
  return (
    <div className="flex items-center gap-md py-md">
      <SkeletonCircle size={36} />
      <SkeletonLine width={160} height={14} />
    </div>
  );
}

/**
 * AddMembersModal — selector paginado de alumnos para agregar a un grupo.
 * Filtra los que ya son miembros. Selección multi por ID (cross-página).
 */
export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  open,
  onClose,
  groupId,
  currentMemberIds,
  onAdded,
}) => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Load all students once when modal opens
  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all pages to build selector (coaches typically have <100 students)
      const res = await listStudents({ page: 1, search: undefined });
      const all = res.items.filter((s) => !currentMemberIds.includes(s.id));
      setStudents(all);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar los alumnos"));
    } finally {
      setLoading(false);
    }
  }, [currentMemberIds]);

  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setSelectedIds(new Set());
      setSearch("");
      setPage(1);
      setSubmitError(null);
      loadStudents();
    }
    prevOpen.current = open;
  }, [open, loadStudents]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        getDisplayName(s).toLowerCase().includes(term) ||
        s.username.toLowerCase().includes(term)
    );
  }, [students, search]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedStudents = filteredStudents.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await addGroupMembers(groupId, Array.from(selectedIds));
      onAdded();
      onClose();
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Error al agregar miembros"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar alumnos" size="sm" dismissable={!submitting}>
      <div className="flex flex-col gap-lg">
        {submitError && <ErrorBanner message={submitError} />}

        {loading ? (
          <div className="flex flex-col gap-sm">
            <StudentRowSkeleton />
            <StudentRowSkeleton />
            <StudentRowSkeleton />
          </div>
        ) : error ? (
          <ErrorBanner message={error} />
        ) : students.length === 0 ? (
          <p className="text-sm text-fg-secondary text-center py-xl">
            No hay alumnos disponibles para agregar.
          </p>
        ) : (
          <>
            {students.length > SEARCH_THRESHOLD && (
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Buscar por nombre..."
              />
            )}

            {search.trim() !== "" && filteredStudents.length === 0 ? (
              <p className="text-sm text-fg-secondary text-center py-xl">
                No encontramos resultados para esa búsqueda.
              </p>
            ) : (
              <div
                className="rounded-md overflow-hidden"
                style={{
                  border: "1px solid var(--separator-subtle)",
                }}
              >
                {pagedStudents.map((student, idx) => {
                  const selected = selectedIds.has(student.id);
                  const initials = getUserInitials(student);
                  const displayName = getDisplayName(student);
                  const isLast = idx === pagedStudents.length - 1;

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggle(student.id)}
                      className="w-full flex items-center gap-md px-lg py-md text-left transition-colors hover:bg-fill-quaternary"
                      style={{
                        borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)",
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
              </div>
            )}

            {/* Paginación client-side */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-md">
                <span className="text-xs text-fg-tertiary">
                  Pág {safePage} de {totalPages}
                </span>
                <div className="flex items-center gap-sm">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer con CTA */}
        <div className="flex flex-col gap-sm pt-sm" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
          <Button
            variant="primary"
            size="md"
            loading={submitting}
            disabled={submitting || selectedIds.size === 0}
            onClick={handleAdd}
            iconLeft={<Users size={16} />}
            className="w-full"
          >
            {selectedIds.size > 0
              ? `Agregar (${selectedIds.size})`
              : "Agregar"}
          </Button>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={submitting}
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
