"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Chip } from "@/components/ui/Chip";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { RoutineCard } from "@/components/routines/RoutineCard";
import { listRoutines } from "@/lib/api/routines";
import { getErrorMessage } from "@/lib/utils";
import type { Routine } from "@/lib/api/types";

type FilterKey = "all" | "assigned" | "unassigned";

/**
 * /routines — Lista de rutinas del coach.
 */
export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [filteredRoutines, setFilteredRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // totalPages se calcula en el componente Pagination a partir de total/perPage
  const PER_PAGE = 12;

  const loadRoutines = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listRoutines({ page: p, search: q || undefined });
      setRoutines(res.items);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las rutinas."));
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial y cuando cambia la búsqueda paginada
  useEffect(() => {
    loadRoutines(page, search);
  }, [page, loadRoutines]); // eslint-disable-line react-hooks/exhaustive-deps
  // La búsqueda se aplica con debounce a través de handleSearchChange

  // Filtrado client-side de assigned/unassigned (la API devuelve todo)
  useEffect(() => {
    let result = routines;
    if (filter === "assigned") {
      result = routines.filter(
        (r) =>
          (r.shares ?? []).filter((s) => s.status === "active").length > 0
      );
    } else if (filter === "unassigned") {
      result = routines.filter(
        (r) =>
          (r.shares ?? []).filter((s) => s.status === "active").length === 0
      );
    }
    setFilteredRoutines(result);
  }, [routines, filter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    loadRoutines(1, val);
  };

  const assignedCount = routines.filter(
    (r) => (r.shares ?? []).filter((s) => s.status === "active").length > 0
  ).length;
  const unassignedCount = routines.length - assignedCount;

  return (
    <div className="flex flex-col gap-xxl">
      {/* Header */}
      <div className="flex items-start justify-between gap-lg flex-wrap">
        <div>
          <h1
            className="text-display font-bold tracking-tight m-0"
            style={{ letterSpacing: "-0.4px" }}
          >
            Mis rutinas
          </h1>
          <p className="text-base text-fg-secondary mt-xs m-0">
            Rutinas reutilizables que podés asignar a alumnos
          </p>
        </div>

        <Link href="/routines/new">
          <Button
            variant="primary"
            size="md"
            iconLeft={<Plus size={16} />}
          >
            Nueva rutina
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-md items-center flex-wrap">
        <div className="flex-1" style={{ maxWidth: "360px" }}>
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar rutina por nombre..."
          />
        </div>

        <div className="flex gap-sm flex-wrap">
          <Chip
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            Todas ({total})
          </Chip>
          <Chip
            active={filter === "assigned"}
            onClick={() => setFilter("assigned")}
          >
            Asignadas ({assignedCount})
          </Chip>
          <Chip
            active={filter === "unassigned"}
            onClick={() => setFilter("unassigned")}
          >
            Sin asignar ({unassignedCount})
          </Chip>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorBanner message={error} dismissible />}

      {/* Contenido */}
      {loading ? (
        <div
          className="grid gap-lg"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBox key={i} height={160} />
          ))}
        </div>
      ) : filteredRoutines.length === 0 && !search && filter === "all" ? (
        /* Empty state cuando no hay NINGUNA rutina creada */
        <EmptyState
          icon={<Dumbbell size={24} />}
          title="Todavía no tenés rutinas"
          description="Creá tu primera rutina con ejercicios, series y descansos. Después podés asignarla a alumnos."
          action={
            <Link href="/routines/new">
              <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
                Crear mi primera rutina
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div
            className="grid gap-lg"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            {filteredRoutines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                href={`/routines/${routine.id}`}
              />
            ))}

            {/* CTA card dashed de "Nueva rutina" */}
            <Link
              href="/routines/new"
              className="flex flex-col items-center justify-center gap-md p-xxl rounded-lg text-center group"
              style={{
                background: "var(--card)",
                border: "1.5px dashed var(--separator)",
                minHeight: "160px",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "var(--primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "var(--separator)";
              }}
            >
              <div
                className="w-12 h-12 rounded-pill flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                }}
              >
                <Plus size={20} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <p className="text-base font-semibold text-fg m-0">
                  Crear rutina nueva
                </p>
                <p className="text-sm text-fg-tertiary m-0 mt-xxs">
                  Agregá ejercicios, series y descansos.
                </p>
              </div>
            </Link>
          </div>

          {/* Paginación */}
          {total > PER_PAGE && (
            <Pagination
              page={page}
              perPage={PER_PAGE}
              total={total}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
