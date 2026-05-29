"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Layers, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ExerciseCard, ExerciseCardItem } from "@/components/exercises/ExerciseCard";
import {
  listMyExercises,
  searchExercises,
  getMuscleGroups,
  deleteExercise,
} from "@/lib/api/exercises";
import { getErrorMessage } from "@/lib/utils";
import type { PaginationMeta, VariablesConfig } from "@/lib/api/types";
import type { MuscleGroup } from "@/lib/api/exercises";

// Backend devuelve shape extendida en listMyExercises/search
interface ExerciseFromAPI {
  id: number;
  name: string;
  description?: string | null;
  muscle_group?: string | null;
  muscle_groups?: string[] | null;
  is_custom?: boolean;
  created_by?: number | null;
  exercise_type?: string | null;
  variables_config?: VariablesConfig | null;
}

function apiToCardItem(ex: ExerciseFromAPI): ExerciseCardItem {
  return {
    id: ex.id,
    name: ex.name,
    description: ex.description,
    // El backend puede devolver muscle_groups[] o muscle_group (string legacy)
    muscle_groups: ex.muscle_groups ?? (ex.muscle_group ? [ex.muscle_group] : []),
    exercise_type: ex.exercise_type as string | null | undefined,
    variables_config: ex.variables_config,
    is_custom: ex.is_custom,
    created_by: ex.created_by,
  };
}

// ─── Sección: Mis ejercicios custom ─────────────────────────────────────────

function MyExercisesSection() {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseCardItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExerciseCardItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMyExercises({ page: p });
      const items = (res.items as ExerciseFromAPI[]).map(apiToCardItem);
      setExercises(items);
      setPagination(res.pagination);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar tus ejercicios."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExercise(deleteTarget.id);
      setDeleteTarget(null);
      load(page);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar el ejercicio."));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <ErrorBanner message={error} dismissible />;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonBox key={i} height={140} />
        ))}
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={24} />}
        title="Sin ejercicios propios"
        description="Creá tu primer ejercicio personalizado para usarlo en tus rutinas."
        action={
          <Link href="/exercises/new">
            <Button variant="primary" iconLeft={<Plus size={16} />}>
              Crear ejercicio
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/exercises/${ex.id}`)}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteTarget(ex)}
                >
                  Eliminar
                </Button>
              </>
            }
          />
        ))}
      </div>

      {pagination && pagination.total_pages > 1 && (
        <Pagination
          page={page}
          perPage={pagination.per_page}
          total={pagination.total}
          onPageChange={setPage}
          className="mt-lg"
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar ejercicio"
        description={`¿Confirmás que querés eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

// ─── Sección: Buscar en el catálogo público ─────────────────────────────────

function CatalogSearchSection() {
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [results, setResults] = useState<ExerciseCardItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Cargar grupos musculares al montar
  useEffect(() => {
    getMuscleGroups()
      .then(setMuscleGroups)
      .catch(() => setMuscleGroups([]));
  }, []);

  const doSearch = useCallback(async (q: string, mg: string, p: number) => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await searchExercises({ q, muscleGroup: mg || undefined, page: p });
      const items = (res.items as ExerciseFromAPI[]).map(apiToCardItem);
      setResults(items);
      setPagination(res.pagination);
    } catch (err) {
      setError(getErrorMessage(err, "Error al buscar ejercicios."));
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar cuando cambia la query (debounce simple via useEffect + timeout)
  useEffect(() => {
    if (!query && !selectedGroup) {
      setResults([]);
      setSearched(false);
      return;
    }
    const tid = setTimeout(() => {
      setPage(1);
      doSearch(query, selectedGroup, 1);
    }, 400);
    return () => clearTimeout(tid);
  }, [query, selectedGroup, doSearch]);

  useEffect(() => {
    if (!searched) return;
    doSearch(query, selectedGroup, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="flex flex-col gap-lg">
      {/* Controles de búsqueda */}
      <div className="flex flex-col gap-md">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar ejercicios en el catálogo..."
        />

        {/* Filtros por grupo muscular */}
        {muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            <button
              type="button"
              onClick={() => setSelectedGroup("")}
              className={[
                "px-md py-xs rounded-pill text-sm font-medium border transition-colors cursor-pointer",
              ].join(" ")}
              style={
                !selectedGroup
                  ? {
                      background: "var(--primary-alpha-12)",
                      borderColor: "var(--primary)",
                      color: "var(--primary)",
                    }
                  : {
                      background: "var(--fill-tertiary)",
                      borderColor: "transparent",
                      color: "var(--fg-secondary)",
                    }
              }
            >
              Todos
            </button>
            {muscleGroups.map((mg) => {
              const isSelected = selectedGroup === mg.name;
              return (
                <button
                  key={mg.id}
                  type="button"
                  onClick={() => setSelectedGroup(isSelected ? "" : mg.name)}
                  className="px-md py-xs rounded-pill text-sm font-medium border transition-colors cursor-pointer"
                  style={
                    isSelected
                      ? {
                          background: "var(--primary-alpha-12)",
                          borderColor: "var(--primary)",
                          color: "var(--primary)",
                        }
                      : {
                          background: "var(--fill-tertiary)",
                          borderColor: "transparent",
                          color: "var(--fg-secondary)",
                        }
                  }
                >
                  {mg.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && <ErrorBanner message={error} dismissible />}

      {/* Resultados */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonBox key={i} height={120} />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div
          className="flex flex-col items-center gap-md py-xxl text-center rounded-lg"
          style={{ border: "1.5px dashed var(--separator)", background: "var(--card)" }}
        >
          <Search size={24} style={{ color: "var(--fg-tertiary)" }} />
          <p className="text-base text-fg-secondary m-0">
            No se encontraron ejercicios con esa búsqueda.
          </p>
        </div>
      )}

      {!loading && !searched && (
        <div
          className="flex flex-col items-center gap-md py-xxl text-center rounded-lg"
          style={{ border: "1.5px dashed var(--separator)", background: "var(--card)" }}
        >
          <BookOpen size={24} style={{ color: "var(--fg-tertiary)" }} />
          <p className="text-base text-fg-secondary m-0">
            Buscá en el catálogo público para explorar ejercicios.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
            {results.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                // Catálogo: solo lectura, sin acciones de editar/eliminar
              />
            ))}
          </div>

          {pagination && pagination.total_pages > 1 && (
            <Pagination
              page={page}
              perPage={pagination.per_page}
              total={pagination.total}
              onPageChange={setPage}
              className="mt-sm"
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

/**
 * /exercises — Gestión de ejercicios personalizados del coach + búsqueda en catálogo.
 */
export default function ExercisesPage() {
  return (
    <div className="flex flex-col gap-xxl">
      {/* Header */}
      <div className="flex items-start justify-between gap-lg">
        <div>
          <h1
            className="text-display font-bold tracking-tight"
            style={{ margin: 0, letterSpacing: "-0.4px" }}
          >
            Mis ejercicios
          </h1>
          <p className="text-base text-fg-secondary mt-xs m-0">
            Ejercicios personalizados que creaste para tus alumnos
          </p>
        </div>
        <Link href="/exercises/new">
          <Button variant="primary" iconLeft={<Plus size={16} />}>
            Crear ejercicio
          </Button>
        </Link>
      </div>

      {/* Sección 1: Mis ejercicios */}
      <section className="flex flex-col gap-lg">
        <SectionHeader title="Mis ejercicios personalizados" />
        <MyExercisesSection />
      </section>

      {/* Sección 2: Catálogo público */}
      <section className="flex flex-col gap-lg">
        <SectionHeader
          title="Catálogo público"
          subtitle="Explorá ejercicios del catálogo general (solo lectura)"
        />
        <CatalogSearchSection />
      </section>
    </div>
  );
}
