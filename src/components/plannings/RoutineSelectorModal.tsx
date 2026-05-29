"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { listRoutines } from "@/lib/api/routines";
import { getErrorMessage } from "@/lib/utils";
import type { Routine } from "@/lib/api/types";

interface RoutineSelectorModalProps {
  open: boolean;
  selectedRoutineId: number | null; // null = descanso
  onSelect: (routineId: number | null) => void;
  onClose: () => void;
  week: number;
  dayLabel: string;
}

export const RoutineSelectorModal: React.FC<RoutineSelectorModalProps> = ({
  open,
  selectedRoutineId,
  onSelect,
  onClose,
  week,
  dayLabel,
}) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Cargamos todas las rutinas propias del coach (sin paginación por simplicidad)
      const res = await listRoutines({ page: 1 });
      setRoutines(res.items);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las rutinas."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setSearch("");
    }
  }, [open, load]);

  const filtered = routines.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (routineId: number | null) => {
    onSelect(routineId);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${dayLabel} — Semana ${week}`}
      size="md"
    >
      <div className="flex flex-col gap-lg">
        {error && <ErrorBanner message={error} />}

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar rutina..."
        />

        {/* Opción Descanso */}
        <button
          type="button"
          onClick={() => handleSelect(null)}
          className={[
            "flex items-center justify-between gap-md p-md rounded-md text-left transition-colors",
            selectedRoutineId === null
              ? "border-primary text-primary"
              : "text-fg-secondary hover:text-fg",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            background:
              selectedRoutineId === null
                ? "var(--primary-alpha-08)"
                : "var(--fill-tertiary)",
            border: `1px solid ${selectedRoutineId === null ? "var(--primary)" : "transparent"}`,
          }}
        >
          <span className="text-sm font-semibold uppercase tracking-wide">
            Descanso
          </span>
          {selectedRoutineId === null && (
            <Check size={16} style={{ color: "var(--primary)" }} />
          )}
        </button>

        {/* Lista de rutinas */}
        {loading ? (
          <div className="flex flex-col gap-sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLine key={i} height={48} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-fg-tertiary text-center py-xl">
            {search ? "Sin resultados para esa búsqueda." : "No tenés rutinas creadas."}
          </p>
        ) : (
          <div className="flex flex-col gap-xs max-h-64 overflow-y-auto">
            {filtered.map((routine) => {
              const isSelected = routine.id === selectedRoutineId;
              return (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => handleSelect(routine.id)}
                  className={[
                    "flex items-center justify-between gap-md p-md rounded-md text-left transition-colors",
                    isSelected ? "border-primary" : "hover:bg-fill-tertiary",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    background: isSelected ? "var(--primary-alpha-08)" : "var(--fill-quaternary)",
                    border: `1px solid ${isSelected ? "var(--primary)" : "transparent"}`,
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg m-0 truncate">{routine.title}</p>
                    {routine.description && (
                      <p className="text-xs text-fg-tertiary m-0 truncate">{routine.description}</p>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={16} className="flex-shrink-0" style={{ color: "var(--primary)" }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Link crear nueva rutina */}
        <div
          className="flex items-center justify-between pt-md"
          style={{ borderTop: "1px solid var(--separator-subtle)" }}
        >
          <p className="text-xs text-fg-tertiary m-0">
            ¿No encontrás la rutina?
          </p>
          <Link href="/routines/new" onClick={onClose}>
            <Button type="button" variant="ghost" size="sm" iconLeft={<Plus size={14} />}>
              Crear rutina
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
};
