"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Pagination } from "@/components/ui/Pagination";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  PlanningCard,
  PLANNING_CARD_HEIGHT,
} from "@/components/plannings/PlanningCard";
import { listPlannings } from "@/lib/api/plannings";
import { getErrorMessage } from "@/lib/utils";
import type { Planning } from "@/lib/api/types";

const PER_PAGE = 8;

// Filtro por días asignados (valor = clave inglesa; label = español)
const DAY_OPTIONS: { value: string; label: string }[] = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

export default function PlanningsPage() {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dayFilters, setDayFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (p: number, q: string, days: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listPlannings({
          page: p,
          per_page: PER_PAGE,
          search: q || undefined,
          day_of_week: days.length ? days.join(",") : undefined,
        });
        const items = Array.isArray(res) ? res : res.items ?? [];
        setPlannings(items as Planning[]);
        setTotal(Array.isArray(res) ? items.length : res.pagination?.total ?? 0);
      } catch (err) {
        setError(getErrorMessage(err, "No se pudieron cargar las planificaciones."));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Carga al montar y ante cualquier cambio de página/búsqueda/filtros (con debounce).
  useEffect(() => {
    const t = setTimeout(() => {
      load(page, search, dayFilters);
    }, 250);
    return () => clearTimeout(t);
  }, [page, search, dayFilters, load]);

  const hasActiveFilters = Boolean(search || dayFilters.length);

  return (
    <div className="flex flex-col gap-lg">
      {error && <ErrorBanner message={error} dismissible />}

      {/* Controles: buscador + filtro de estado a la izquierda, nueva a la derecha */}
      <div className="flex gap-md items-center flex-wrap">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar planificación..."
          className="w-72 flex-shrink-0"
        />

        <MultiSelect
          selected={dayFilters}
          onChange={(v) => {
            setDayFilters(v);
            setPage(1);
          }}
          ariaLabel="Filtrar por día asignado"
          placeholder="Días"
          options={DAY_OPTIONS}
        />

        <Link href="/plannings/new" className="ml-auto flex-shrink-0">
          <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
            Nueva planificación
          </Button>
        </Link>
      </div>

      {/* Contenido */}
      {loading ? (
        <GradientSurface>
          <div className="min-h-[792px] md:min-h-[600px] xl:min-h-[408px]">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-lg p-xl">
              {Array.from({ length: PER_PAGE }).map((_, i) => (
                <SkeletonBox key={i} height={PLANNING_CARD_HEIGHT} />
              ))}
            </div>
          </div>
          {/* Shell de paginación */}
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
      ) : plannings.length === 0 && !hasActiveFilters ? (
        /* No hay NINGUNA planificación creada */
        <GradientSurface>
          <div className="flex flex-col items-center justify-center gap-sm py-5xl px-xl text-center">
            <CalendarDays size={28} style={{ color: "var(--fg-tertiary)" }} />
            <p className="text-base font-medium text-fg m-0">
              No tenés planificaciones
            </p>
            <p className="text-sm text-fg-secondary m-0">
              Creá tu primer ciclo de entrenamiento por semanas y asignalo a tus alumnos.
            </p>
            <Link href="/plannings/new" className="mt-sm">
              <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
                Nueva planificación
              </Button>
            </Link>
          </div>
        </GradientSurface>
      ) : (
        <GradientSurface>
          <div className="flex flex-col min-h-[792px] md:min-h-[600px] xl:min-h-[408px]">
            {plannings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-sm py-5xl px-xl text-center">
                <CalendarDays size={28} style={{ color: "var(--fg-tertiary)" }} />
                <p className="text-sm text-fg-secondary m-0">
                  No hay planificaciones que coincidan con los filtros.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-lg p-xl">
                {plannings.map((planning) => (
                  <PlanningCard
                    key={planning.id}
                    planning={planning}
                    href={`/plannings/${planning.id}`}
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
