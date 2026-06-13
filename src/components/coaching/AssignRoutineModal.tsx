"use client";

/**
 * AssignRoutineModal
 *
 * Permite al coach asignar (compartir) una rutina a UN alumno.
 * Flujo: paso 1 → seleccionar alumno · paso 2 → confirmar asignación.
 *
 * Props:
 *   open         — controla visibilidad
 *   routineId    — id de la rutina a asignar
 *   routineTitle — nombre para mostrar en el subtítulo
 *   onClose      — callback al cerrar
 *   onAssigned   — callback con studentId tras asignación exitosa
 */

import React, { useEffect, useState } from "react";
import { Users, CheckCircle2, Dumbbell } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";

const PER_PAGE = 5;

import { listStudents } from "@/lib/api/coaching";
import { shareRoutine, listRoutineShares } from "@/lib/api/routines";
import { getErrorMessage } from "@/lib/utils";
import type { StudentListItem } from "@/lib/api/coaching";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AssignRoutineModalProps {
  open: boolean;
  routineId: number;
  routineTitle: string;
  onClose: () => void;
  onAssigned?: (studentId: number) => void;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-xs">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonBox key={i} height={52} />
      ))}
    </div>
  );
}

// ─── StudentRow ────────────────────────────────────────────────────────────────

interface StudentRowProps {
  student: StudentListItem;
  isAssigned: boolean;
  isAssigning: boolean;
  onClick: () => void;
}

const StudentRow: React.FC<StudentRowProps> = ({
  student,
  isAssigned,
  isAssigning,
  onClick,
}) => {
  const displayName =
    student.first_name || student.last_name
      ? [student.first_name, student.last_name].filter(Boolean).join(" ")
      : student.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isAssigned || isAssigning}
      className="w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-colors hover:bg-fill-tertiary disabled:cursor-not-allowed"
      style={{ background: "transparent" }}
    >
      <Avatar src={student.avatar_url} initials={initials} size="sm" />

      <div className="flex flex-col gap-xxs min-w-0 flex-1">
        <span className="text-sm font-medium text-fg truncate">{displayName}</span>
        {student.username !== displayName && (
          <span className="text-xs text-fg-tertiary">@{student.username}</span>
        )}
      </div>

      <div className="flex-shrink-0">
        {isAssigning ? (
          <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : isAssigned ? (
          <span
            className="inline-flex items-center gap-xs text-xs font-medium px-sm py-xxs rounded-pill"
            style={{
              background: "var(--primary-alpha-12)",
              color: "var(--primary)",
            }}
          >
            <CheckCircle2 size={12} />
            Ya asignada
          </span>
        ) : null}
      </div>
    </button>
  );
};

// ─── Componente principal ───────────────────────────────────────────────────────

export const AssignRoutineModal: React.FC<AssignRoutineModalProps> = ({
  open,
  routineId,
  routineTitle,
  onClose,
  onAssigned,
}) => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  /** Query aplicada (con debounce) — lo que se manda al backend. */
  const [appliedQuery, setAppliedQuery] = useState("");
  const [assigningId, setAssigningId] = useState<number | null>(null);

  // Debounce de la búsqueda → resetea a la página 1
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setAppliedQuery(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query, open]);

  // Cargar alumnos (server-side: paginado + búsqueda)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listStudents({
          page,
          search: appliedQuery || undefined,
          limit: PER_PAGE,
        });
        if (!cancelled) {
          setStudents(res.items ?? []);
          setTotal(res.pagination?.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "No se pudieron cargar los alumnos."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, page, appliedQuery]);

  // Shares activos de esta rutina (una sola vez al abrir)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listRoutineShares()
      .then((shares) => {
        if (cancelled) return;
        const ids = new Set(
          shares
            .filter(
              (s) =>
                s.routine_id === routineId &&
                s.status === "active" &&
                s.shared_with !== null
            )
            .map((s) => s.shared_with as number)
        );
        setAssignedStudentIds(ids);
      })
      .catch(() => {
        /* el error de carga de alumnos ya se muestra; los shares son best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [open, routineId]);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setAppliedQuery("");
      setPage(1);
      setError(null);
    }
  }, [open]);

  const handleAssign = async (student: StudentListItem) => {
    if (assigningId !== null || assignedStudentIds.has(student.id)) return;
    setAssigningId(student.id);
    setError(null);
    try {
      await shareRoutine(routineId, { shared_with: student.id });
      setAssignedStudentIds((prev) => new Set([...prev, student.id]));
      onAssigned?.(student.id);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo asignar la rutina."));
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignar a alumno"
      size="md"
      dismissable={assigningId === null}
    >
      <div className="flex flex-col gap-lg">
        {/* Subtítulo con nombre de la rutina */}
        <div className="flex items-center gap-sm">
          <Dumbbell size={16} className="text-fg-tertiary flex-shrink-0" />
          <p className="text-sm text-fg-secondary m-0 truncate">
            {routineTitle}
          </p>
        </div>

        {/* Buscador */}
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar alumno..."
        />

        {/* Error */}
        {error && <ErrorBanner message={error} />}

        {/* Lista + paginación (contenedor de alto fijo) */}
        <div
          className="rounded-lg overflow-hidden flex flex-col"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <div
            className="flex flex-col"
            style={{ minHeight: "316px" }}
          >
            {loading ? (
              <div className="p-sm">
                <ListSkeleton />
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-md py-xxl px-lg text-center">
                <Users size={24} className="text-fg-tertiary" />
                <p className="text-sm text-fg-tertiary m-0">
                  {appliedQuery
                    ? "No hay resultados para esa búsqueda."
                    : "No tenés alumnos activos."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-xs p-sm">
                {students.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    isAssigned={assignedStudentIds.has(student.id)}
                    isAssigning={assigningId === student.id}
                    onClick={() => handleAssign(student)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Paginación — siempre presente (VIEW_BASES base #4) */}
          <div style={{ borderTop: "1px solid var(--separator-subtle)" }}>
            <Pagination
              page={page}
              perPage={PER_PAGE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </div>

      </div>
    </Modal>
  );
};
