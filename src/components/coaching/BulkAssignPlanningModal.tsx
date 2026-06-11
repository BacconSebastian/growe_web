"use client";

/**
 * BulkAssignPlanningModal
 *
 * Permite al coach asignar una planning a MÚLTIPLES alumnos en una sola operación.
 * Usa bulkAssignPlanning(planningId, studentIds[]).
 *
 * Props:
 *   open         — controla visibilidad
 *   planningId   — id de la planning a asignar
 *   planningTitle — nombre para mostrar en el subtítulo
 *   onClose      — callback al cerrar
 *   onAssigned   — callback tras asignación exitosa con results
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Users, CheckSquare, Square, CalendarDays } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonBox } from "@/components/ui/Skeleton";

import { listStudents, bulkAssignPlanning } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import type { BulkAssignResponse } from "@/lib/api/types";
import type { StudentListItem } from "@/lib/api/coaching";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface BulkAssignPlanningModalProps {
  open: boolean;
  planningId: number;
  planningTitle: string;
  onClose: () => void;
  onAssigned?: (response: BulkAssignResponse) => void;
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
  selected: boolean;
  onToggle: (id: number) => void;
}

const StudentRow: React.FC<StudentRowProps> = ({ student, selected, onToggle }) => {
  const displayName =
    student.first_name || student.last_name
      ? [student.first_name, student.last_name].filter(Boolean).join(" ")
      : student.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onToggle(student.id)}
      className="w-full flex items-center gap-md px-md py-sm rounded-lg text-left transition-colors hover:bg-fill-tertiary"
      style={{
        background: selected ? "var(--primary-alpha-08)" : "transparent",
        border: `1px solid ${selected ? "var(--primary-alpha-20)" : "transparent"}`,
      }}
    >
      {/* Checkbox */}
      <span
        className="flex-shrink-0 text-primary"
        style={{ color: selected ? "var(--primary)" : "var(--fg-tertiary)" }}
      >
        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
      </span>

      {/* Avatar */}
      <Avatar
        src={student.avatar_url}
        initials={initials}
        size="sm"
      />

      {/* Info */}
      <div className="flex flex-col gap-xxs min-w-0 flex-1">
        <span className="text-sm font-medium text-fg truncate">{displayName}</span>
        {student.username !== displayName && (
          <span className="text-xs text-fg-tertiary">@{student.username}</span>
        )}
      </div>
    </button>
  );
};

// ─── Componente principal ───────────────────────────────────────────────────────

export const BulkAssignPlanningModal: React.FC<BulkAssignPlanningModalProps> = ({
  open,
  planningId,
  planningTitle,
  onClose,
  onAssigned,
}) => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Resultados de la asignación bulk (éxitos / errores por alumno)
  const [results, setResults] = useState<BulkAssignResponse | null>(null);

  // Cargar alumnos al abrir
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
        if (!cancelled) setStudents(allStudents);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "No se pudieron cargar los alumnos."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open]);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setError(null);
      setSelectedIds(new Set());
      setResults(null);
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

  const toggleStudent = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    setAssigning(true);
    setError(null);
    try {
      const response = await bulkAssignPlanning(planningId, Array.from(selectedIds));
      setResults(response);
      onAssigned?.(response);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo asignar la planificación."));
    } finally {
      setAssigning(false);
    }
  };

  // ─── Vista de resultados ──────────────────────────────────────────────────

  if (results) {
    const successCount = results.results.filter((r) => r.success).length;
    const failCount = results.results.filter((r) => !r.success).length;

    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Planificación asignada"
        size="sm"
      >
        <div className="flex flex-col gap-lg">
          <div className="flex flex-col gap-md">
            {successCount > 0 && (
              <p className="text-sm text-fg m-0">
                <span className="font-semibold" style={{ color: "var(--success)" }}>
                  {successCount} alumno{successCount !== 1 ? "s" : ""}
                </span>{" "}
                recibirán la planificación exitosamente.
              </p>
            )}
            {failCount > 0 && (
              <div className="flex flex-col gap-xs">
                <p className="text-sm text-fg-secondary m-0">
                  {failCount} asignación{failCount !== 1 ? "es" : ""} no pudieron completarse:
                </p>
                {results.results
                  .filter((r) => !r.success)
                  .map((r) => {
                    const s = students.find((st) => st.id === r.student_id);
                    const name = s
                      ? s.first_name || s.last_name
                        ? [s.first_name, s.last_name].filter(Boolean).join(" ")
                        : s.username
                      : `Alumno #${r.student_id}`;
                    return (
                      <p key={r.student_id} className="text-xs text-fg-tertiary m-0 pl-sm">
                        · {name}: {r.error ?? "Error desconocido"}
                      </p>
                    );
                  })}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ─── Vista de selección ────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignar a alumnos"
      size="md"
      dismissable={!assigning}
    >
      <div className="flex flex-col gap-lg">
        {/* Subtítulo */}
        <div className="flex items-center gap-sm">
          <CalendarDays size={16} className="text-fg-tertiary flex-shrink-0" />
          <p className="text-sm text-fg-secondary m-0 truncate">
            {planningTitle}
          </p>
        </div>

        {/* Buscador */}
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar alumno..."
        />

        {/* Contador de seleccionados */}
        {selectedIds.size > 0 && (
          <p className="text-sm text-fg-secondary m-0 -mt-xs">
            <span className="font-semibold" style={{ color: "var(--primary)" }}>
              {selectedIds.size} alumno{selectedIds.size !== 1 ? "s" : ""}
            </span>{" "}
            seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </p>
        )}

        {/* Error */}
        {error && <ErrorBanner message={error} />}

        {/* Lista */}
        <div
          className="rounded-lg overflow-hidden overflow-y-auto"
          style={{
            border: "1px solid var(--card-border)",
            minHeight: "100px",
            maxHeight: "300px",
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
                  selected={selectedIds.has(student.id)}
                  onToggle={toggleStudent}
                />
              ))}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-sm">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            loading={assigning}
            disabled={selectedIds.size === 0 || loading}
            onClick={handleAssign}
          >
            Asignar a {selectedIds.size > 0 ? `${selectedIds.size} alumno${selectedIds.size !== 1 ? "s" : ""}` : "alumnos"}
          </Button>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              disabled={assigning}
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
