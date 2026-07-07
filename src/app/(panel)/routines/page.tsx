"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Pagination } from "@/components/ui/Pagination";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonCircle } from "@/components/ui/Skeleton";
import { RoutineRow, ROW_HEIGHT } from "@/components/routines/RoutineCard";
import { listRoutines } from "@/lib/api/routines";
import { getErrorMessage } from "@/lib/utils";
import type { Routine } from "@/lib/api/types";

const PER_PAGE = 7;

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ListSkeleton() {
  const rows = Array.from({ length: PER_PAGE }, (_, i) => i);
  return (
    <GradientSurface>
      <div
        className="flex flex-col"
        style={{ minHeight: ROW_HEIGHT * PER_PAGE }}
      >
        {rows.map((i) => (
          <div
            key={i}
            className="flex items-center gap-md px-xl"
            style={{
              height: ROW_HEIGHT,
              ...(i < PER_PAGE - 1
                ? { borderBottom: "1px solid var(--separator-subtle)" }
                : {}),
            }}
          >
            <SkeletonCircle size={40} />
            <div className="flex flex-col gap-xs flex-1">
              <SkeletonLine width={160} height={14} />
              <div className="flex gap-xs">
                <SkeletonLine width={90} height={18} className="rounded-pill" />
                <SkeletonLine width={70} height={18} className="rounded-pill" />
              </div>
            </div>
            <SkeletonLine width={88} height={30} />
          </div>
        ))}
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
  );
}

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
        <ListSkeleton />
      ) : routines.length === 0 && !hasActiveFilters ? (
        /* No hay NINGUNA rutina creada — dentro de GradientSurface con Pagination (VIEW_BASES §4) */
        <GradientSurface>
          <div
            className="flex flex-col items-center justify-center gap-sm px-xl text-center"
            style={{ minHeight: ROW_HEIGHT * PER_PAGE }}
          >
            <Dumbbell size={28} style={{ color: "var(--fg-tertiary)" }} />
            <p className="text-base font-medium text-fg m-0">
              Todavía no tenés rutinas
            </p>
            <p className="text-sm text-fg-secondary m-0">
              Creá tu primera rutina con ejercicios, series y descansos. Después podés asignarla a alumnos.
            </p>
            <Link href="/routines/new" className="mt-sm">
              <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
                Crear mi primera rutina
              </Button>
            </Link>
          </div>
          {/* Paginación siempre visible */}
          <div style={{ borderTop: "1px solid var(--separator-subtle)" }}>
            <Pagination
              page={page}
              perPage={PER_PAGE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </GradientSurface>
      ) : (
        /* Filas wrapeadas en GradientSurface — el alto reservado para PER_PAGE filas
           asegura que la paginación siempre quede en el mismo lugar. */
        <GradientSurface>
          <div
            className="flex flex-col"
            style={{ minHeight: ROW_HEIGHT * PER_PAGE }}
          >
            {routines.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-sm px-xl text-center"
                style={{ minHeight: ROW_HEIGHT * PER_PAGE }}
              >
                <Dumbbell size={28} style={{ color: "var(--fg-tertiary)" }} />
                <p className="text-sm text-fg-secondary m-0">
                  No hay rutinas que coincidan con los filtros.
                </p>
              </div>
            ) : (
              routines.map((routine, idx) => (
                <RoutineRow
                  key={routine.id}
                  routine={routine}
                  href={`/routines/${routine.id}`}
                  isLast={idx === routines.length - 1}
                />
              ))
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
