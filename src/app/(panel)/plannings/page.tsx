"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SearchInput } from "@/components/ui/SearchInput";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlanningCard } from "@/components/plannings/PlanningCard";
import { listPlannings } from "@/lib/api/plannings";
import { getErrorMessage } from "@/lib/utils";
import type { Planning } from "@/lib/api/types";

type FilterStatus = "all" | "active" | "draft" | "scheduled" | "completed";

const FILTER_CHIPS: { key: FilterStatus; label: string }[] = [
  { key: "all",       label: "Todas"       },
  { key: "active",    label: "Activas"     },
  { key: "draft",     label: "Borrador"    },
  { key: "scheduled", label: "Programadas" },
  { key: "completed", label: "Completadas" },
];

export default function PlanningsPage() {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  // Debounce de búsqueda
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: string; search?: string } = {};
      if (filter !== "all") params.status = filter;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await listPlannings(params);
      // El backend puede devolver items directamente o dentro de data
      const items = Array.isArray(res) ? res : (res.items ?? []);
      setPlannings(items as Planning[]);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las planificaciones."));
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const counts: Record<FilterStatus, number> = {
    all:       plannings.length,
    active:    plannings.filter((p) => p.status === "active").length,
    draft:     plannings.filter((p) => p.status === "draft").length,
    scheduled: plannings.filter((p) => p.status === "scheduled").length,
    completed: plannings.filter((p) => p.status === "completed").length,
  };

  // Cuando hay filtro activo recargamos; los counts se calculan sobre los datos actuales
  const visiblePlannings =
    filter === "all"
      ? plannings
      : plannings.filter((p) => p.status === filter);

  return (
    <div className="flex flex-col gap-xxl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-lg flex-wrap">
        <div>
          <h1
            className="text-display font-bold tracking-tight"
            style={{ margin: 0, letterSpacing: "-0.4px" }}
          >
            Planificaciones
          </h1>
          <p className="text-base text-fg-secondary mt-xs m-0">
            {loading ? "Cargando..." : `${plannings.length} ciclo${plannings.length !== 1 ? "s" : ""} creados`}
          </p>
        </div>
        <Link href="/plannings/new">
          <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
            Nueva planificación
          </Button>
        </Link>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex gap-md items-center flex-wrap">
        <div className="flex-1" style={{ maxWidth: 360 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar planificación..."
          />
        </div>
        <div className="flex gap-sm flex-wrap">
          {FILTER_CHIPS.map(({ key, label }) => (
            <Chip
              key={key}
              active={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
              {!loading && filter === key && counts[key] > 0 && (
                <span className="ml-xs opacity-60">({counts[key]})</span>
              )}
            </Chip>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && <ErrorBanner message={error} />}

      {/* Loading */}
      {loading && (
        <div className="grid gap-lg" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBox key={i} height={160} />
          ))}
        </div>
      )}

      {/* Grid de plannings */}
      {!loading && !error && (
        <>
          {visiblePlannings.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={24} />}
              title={
                search || filter !== "all"
                  ? "Sin resultados"
                  : "No tenés planificaciones"
              }
              description={
                search || filter !== "all"
                  ? "Probá cambiar los filtros o la búsqueda."
                  : "Creá tu primer ciclo de entrenamiento por semanas y asignalo a tus alumnos."
              }
              action={
                !search && filter === "all" ? (
                  <Link href="/plannings/new">
                    <Button variant="primary" iconLeft={<Plus size={16} />}>
                      Nueva planificación
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-lg" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              {visiblePlannings.map((planning) => (
                <PlanningCard
                  key={planning.id}
                  planning={planning}
                  href={`/plannings/${planning.id}`}
                />
              ))}

              {/* CTA card: siempre al final si hay items */}
              <Link
                href="/plannings/new"
                className="block rounded-lg transition-opacity hover:opacity-80"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  background: "var(--card)",
                  border: "1.5px dashed var(--separator)",
                  minHeight: "160px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-md)",
                  padding: "var(--space-xxl)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-pill flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                  }}
                >
                  <Plus size={20} style={{ color: "var(--primary)" }} />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-fg m-0">Crear planificación</p>
                  <p className="text-sm text-fg-secondary m-0 mt-xs">
                    Diseñá un ciclo de N semanas con rutinas por día.
                  </p>
                </div>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
