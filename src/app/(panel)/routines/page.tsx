"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Pagination } from "@/components/ui/Pagination";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { RoutineCard, ROUTINE_CARD_HEIGHT } from "@/components/routines/RoutineCard";
import { listRoutines } from "@/lib/api/routines";
import { getErrorMessage } from "@/lib/utils";
import type { Routine } from "@/lib/api/types";

const PER_PAGE = 8;

// Días (valor = clave inglesa que guarda Routine.day_of_week; label = español)
const DAY_OPTIONS: { value: string; label: string }[] = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

// Grupos musculares (catálogo canónico VALID_MUSCLE_GROUPS del backend)
const MUSCLE_OPTIONS: { value: string; label: string }[] = [
  { value: "pecho", label: "Pecho" },
  { value: "espalda", label: "Espalda" },
  { value: "hombros", label: "Hombros" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "cuadriceps", label: "Cuádriceps" },
  { value: "isquiotibiales", label: "Isquiotibiales" },
  { value: "gluteos", label: "Glúteos" },
  { value: "gemelos", label: "Gemelos" },
  { value: "aductores", label: "Aductores" },
  { value: "abdomen", label: "Abdomen" },
  { value: "cardio", label: "Cardio" },
];

/**
 * /routines — Lista de rutinas del coach. Búsqueda + filtros (día / grupo
 * muscular) resueltos a nivel backend porque la lista está paginada.
 */
export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dayFilters, setDayFilters] = useState<string[]>([]);
  const [muscleFilters, setMuscleFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(
    async (p: number, q: string, days: string[], muscles: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listRoutines({
          page: p,
          per_page: PER_PAGE,
          search: q || undefined,
          day_of_week: days.length ? days.join(",") : undefined,
          muscle_group: muscles.length ? muscles.join(",") : undefined,
        });
        setRoutines(res.items);
        setTotal(res.pagination.total);
      } catch (err) {
        setError(getErrorMessage(err, "No se pudieron cargar las rutinas."));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Carga al montar y ante cualquier cambio de página/búsqueda/filtros (con debounce).
  useEffect(() => {
    const t = setTimeout(() => {
      load(page, search, dayFilters, muscleFilters);
    }, 250);
    return () => clearTimeout(t);
  }, [page, search, dayFilters, muscleFilters, load]);

  const hasActiveFilters = Boolean(
    search || dayFilters.length || muscleFilters.length
  );

  return (
    <div className="flex flex-col gap-lg">
      {error && <ErrorBanner message={error} dismissible />}

      {/* Controles: buscador + filtros a la izquierda, nueva rutina a la derecha */}
      <div className="flex gap-md items-center flex-wrap">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar rutina por nombre..."
          className="w-72 flex-shrink-0"
        />

        <MultiSelect
          selected={dayFilters}
          onChange={(v) => {
            setDayFilters(v);
            setPage(1);
          }}
          ariaLabel="Filtrar por día de la semana"
          placeholder="Días"
          options={DAY_OPTIONS}
        />

        <MultiSelect
          selected={muscleFilters}
          onChange={(v) => {
            setMuscleFilters(v);
            setPage(1);
          }}
          ariaLabel="Filtrar por grupo muscular"
          placeholder="Grupos musculares"
          options={MUSCLE_OPTIONS}
        />

        <Link href="/routines/new" className="ml-auto flex-shrink-0">
          <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
            Nueva rutina
          </Button>
        </Link>
      </div>

      {/* Contenido */}
      {loading ? (
        <GradientSurface>
          <div className="min-h-[792px] md:min-h-[600px] xl:min-h-[408px]">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-lg p-xl">
              {Array.from({ length: PER_PAGE }).map((_, i) => (
                <SkeletonBox key={i} height={ROUTINE_CARD_HEIGHT} />
              ))}
            </div>
          </div>
          {/* Shell de paginación — espeja el padding/altura real de <Pagination> */}
          <div
            className="flex items-center justify-between gap-lg py-md px-lg"
            style={{ borderTop: "1px solid var(--separator-subtle)" }}
          >
            <SkeletonLine width={80} height={14} />
            <div className="flex items-center gap-sm">
              <SkeletonLine width={84} height={30} className="rounded-pill" />
              <SkeletonLine width={90} height={30} className="rounded-pill" />
            </div>
          </div>
        </GradientSurface>
      ) : routines.length === 0 && !hasActiveFilters ? (
        /* No hay NINGUNA rutina creada */
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
        /* Cards wrapeadas en un contenedor con la paginación al pie (como Alumnos).
           Alto reservado para una página completa (8 cards) por breakpoint, así la
           paginación queda siempre en el mismo lugar:
           2 col → 4 filas (792px) · 3 col → 3 filas (600px) · 4 col → 2 filas (408px) */
        <GradientSurface>
          <div className="flex flex-col min-h-[792px] md:min-h-[600px] xl:min-h-[408px]">
            {routines.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-sm py-5xl text-center">
                <Dumbbell size={28} style={{ color: "var(--fg-tertiary)" }} />
                <p className="text-sm text-fg-secondary m-0">
                  No hay rutinas que coincidan con los filtros.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-lg p-xl">
                {routines.map((routine) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    href={`/routines/${routine.id}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Paginación — mismo componente, siempre visible, al pie del contenedor */}
          <div style={{ borderTop: "1px solid var(--separator-subtle)" }}>
            <Pagination
              page={page}
              perPage={PER_PAGE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </GradientSurface>
      )}
    </div>
  );
}
