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

import React, { useEffect, useMemo, useState } from "react";
import { Users, CheckCircle2, Dumbbell } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonBox } from "@/components/ui/Skeleton";

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
    <div className="flex flex-col gap-sm">
      {[1, 2, 3].map((i) => (
        <SkeletonBox key={i} height={56} />
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
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [assigningId, setAssigningId] = useState<number | null>(null);

  // Cargar alumnos + shares activos para esta rutina al abrir
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let allStudents: StudentListItem[] = [];
        let page = 1;
        while (true) {
          const res = await listStudents({ page });
          allStudents = [...allStudents, ...(res.items ?? [])];
          if (page >= (res.pagination?.total_pages ?? 1)) break;
          page++;
        }

        // Verificar cuáles alumnos ya tienen esta rutina asignada (share activo)
        const shares = await listRoutineShares();
        const ids = new Set(
          shares
            .filter(
              (s) =>
                s.routine_id === routineId &&
                s.status === "active" &&
                s.shared_with !== null
            )
            .map((s) => s.shared_with as number),
        );

        if (!cancelled) {
          setStudents(allStudents);
          setAssignedStudentIds(ids);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "No se pudieron cargar los alumnos."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, routineId]);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setError(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const fullName = [s.first_name, s.last_name].filter(Boolean).join(" ").toLowerCase();
      return fullName.includes(q) || s.username.toLowerCase().includes(q);
    });
  }, [students, query]);

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

        {/* Lista */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: "1px solid var(--card-border)",
            minHeight: "100px",
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {loading ? (
            <div className="p-md">
              <ListSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-md py-xxl px-lg text-center">
              <Users size={24} className="text-fg-tertiary" />
              <p className="text-sm text-fg-tertiary m-0">
                {students.length === 0
                  ? "No tenés alumnos activos."
                  : "No hay resultados para esa búsqueda."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-xs p-sm">
              {filtered.map((student) => (
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

        {/* Cerrar */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={assigningId !== null}
          >
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
