"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Layers, Dumbbell, Sparkles, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonCircle } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchInput } from "@/components/ui/SearchInput";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Pagination } from "@/components/ui/Pagination";
import { GradientSurface } from "@/components/ui/GradientSurface";
import {
  listMyExercises,
  deleteExercise,
  updateExercise,
  suggestMuscleGroups,
} from "@/lib/api/exercises";
import { getErrorMessage } from "@/lib/utils";

const PER_PAGE = 7;
/** Alto fijo de fila. */
const ROW_HEIGHT = 68;

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

interface ExerciseItem {
  id: number;
  name: string;
  muscle_groups: string[];
}

interface ExerciseFromAPI {
  id: number;
  name: string;
  muscle_group?: string | null;
  muscle_groups?: string[] | null;
}

function apiToItem(ex: ExerciseFromAPI): ExerciseItem {
  return {
    id: ex.id,
    name: ex.name,
    muscle_groups: ex.muscle_groups ?? (ex.muscle_group ? [ex.muscle_group] : []),
  };
}

// ─── Fila de ejercicio ────────────────────────────────────────────────────────

interface ExerciseRowProps {
  exercise: ExerciseItem;
  isLast: boolean;
  suggesting: boolean;
  pending: string[] | null;
  accepting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSuggest: () => void;
  onAccept: () => void;
  onReject: () => void;
}

function ExerciseRow({
  exercise,
  isLast,
  suggesting,
  pending,
  accepting,
  onEdit,
  onDelete,
  onSuggest,
  onAccept,
  onReject,
}: ExerciseRowProps) {
  return (
    <div
      className="flex items-center gap-md px-xl transition-colors duration-100 hover:bg-fill-tertiary"
      style={{
        minHeight: ROW_HEIGHT,
        ...(isLast ? {} : { borderBottom: "1px solid var(--separator-subtle)" }),
      }}
    >
      <div
        className="w-9 h-9 rounded-pill flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--primary-alpha-12)" }}
      >
        <Dumbbell size={16} style={{ color: "var(--primary)" }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg m-0 truncate">{exercise.name}</p>
        <div className="flex items-center gap-xs flex-wrap mt-xxs">
          {exercise.muscle_groups.length > 0 ? (
            exercise.muscle_groups.map((mg) => (
              <Badge key={mg} variant="neutral" size="sm">
                {mg}
              </Badge>
            ))
          ) : pending ? (
            <>
              {pending.map((mg) => (
                <Badge key={mg} variant="neutral" size="sm">
                  {mg}
                </Badge>
              ))}
              <button
                type="button"
                onClick={onAccept}
                disabled={accepting}
                className="inline-flex items-center gap-xxs rounded-pill border px-sm py-xxs text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-60 cursor-pointer"
                style={{
                  background: "var(--success-alpha-12)",
                  borderColor: "var(--success)",
                  color: "var(--success)",
                }}
              >
                {accepting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}
                Aceptar
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={accepting}
                className="inline-flex items-center gap-xxs rounded-pill border border-transparent px-sm py-xxs text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-60 cursor-pointer"
                style={{
                  background: "var(--fill-tertiary)",
                  color: "var(--fg-secondary)",
                }}
              >
                <X size={12} />
                Rechazar
              </button>
            </>
          ) : (
            <>
              <Badge variant="danger" size="sm">
                Sin grupos musculares asignados
              </Badge>
              <button
                type="button"
                onClick={onSuggest}
                disabled={suggesting}
                className="inline-flex items-center gap-xxs rounded-pill border px-sm py-xxs text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-60 cursor-pointer"
                style={{
                  background: "var(--primary-alpha-12)",
                  borderColor: "var(--primary)",
                  color: "var(--primary)",
                }}
              >
                {suggesting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                Sugerir con IA
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-sm flex-shrink-0">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Editar
        </Button>
        <Button variant="dangerSoft" size="sm" onClick={onDelete}>
          Eliminar
        </Button>
      </div>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <GradientSurface>
      <div className="flex flex-col" style={{ minHeight: ROW_HEIGHT * PER_PAGE }}>
        {Array.from({ length: PER_PAGE }, (_, i) => (
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
            <SkeletonCircle size={36} />
            <div className="flex flex-col gap-xs flex-1">
              <SkeletonLine width={160} height={14} />
              <SkeletonLine width={90} height={12} />
            </div>
            <SkeletonLine width={150} height={30} className="rounded-pill" />
          </div>
        ))}
      </div>
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

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ExercisesPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [muscleFilters, setMuscleFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ExerciseItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [suggestingId, setSuggestingId] = useState<number | null>(null);
  // Sugerencias pendientes de aceptar/rechazar, por id de ejercicio.
  const [pending, setPending] = useState<Record<number, string[]>>({});
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const load = useCallback(
    async (p: number, q: string, muscles: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listMyExercises({
          page: p,
          per_page: PER_PAGE,
          search: q || undefined,
          muscle_group: muscles.length ? muscles.join(",") : undefined,
        });
        setExercises((res.items as ExerciseFromAPI[]).map(apiToItem));
        setTotal(res.pagination?.total ?? 0);
      } catch (err) {
        setError(getErrorMessage(err, "No se pudieron cargar tus ejercicios."));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const t = setTimeout(() => {
      load(page, search, muscleFilters);
    }, 250);
    return () => clearTimeout(t);
  }, [page, search, muscleFilters, load]);

  const hasActiveFilters = Boolean(search || muscleFilters.length);

  const handleSuggest = async (ex: ExerciseItem) => {
    setSuggestingId(ex.id);
    setError(null);
    try {
      const suggestions = await suggestMuscleGroups(ex.name);
      if (suggestions.length === 0) {
        setError(`La IA no sugirió grupos para "${ex.name}".`);
        return;
      }
      // No se guarda todavía: queda pendiente de aceptar/rechazar.
      setPending((prev) => ({ ...prev, [ex.id]: suggestions.slice(0, 3) }));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron sugerir grupos musculares."));
    } finally {
      setSuggestingId(null);
    }
  };

  const handleAcceptSuggestion = async (ex: ExerciseItem) => {
    const groups = pending[ex.id];
    if (!groups) return;
    setAcceptingId(ex.id);
    setError(null);
    try {
      await updateExercise(ex.id, { muscle_groups: groups });
      setPending((prev) => {
        const next = { ...prev };
        delete next[ex.id];
        return next;
      });
      await load(page, search, muscleFilters);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar la sugerencia."));
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRejectSuggestion = (ex: ExerciseItem) => {
    setPending((prev) => {
      const next = { ...prev };
      delete next[ex.id];
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExercise(deleteTarget.id);
      setDeleteTarget(null);
      load(page, search, muscleFilters);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar el ejercicio."));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-lg">
      {error && <ErrorBanner message={error} dismissible />}

      {/* Controles: buscador + filtro muscular a la izquierda, crear a la derecha */}
      <div className="flex gap-md items-center flex-wrap">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar ejercicio por nombre..."
          className="w-72 flex-shrink-0"
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

        <Link href="/exercises/new" className="ml-auto flex-shrink-0">
          <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
            Crear ejercicio
          </Button>
        </Link>
      </div>

      {/* Contenido */}
      {loading ? (
        <ListSkeleton />
      ) : exercises.length === 0 && !hasActiveFilters ? (
        <GradientSurface>
          <div className="flex flex-col items-center justify-center gap-sm py-5xl px-xl text-center">
            <Layers size={28} style={{ color: "var(--fg-tertiary)" }} />
            <p className="text-base font-medium text-fg m-0">
              Sin ejercicios propios
            </p>
            <p className="text-sm text-fg-secondary m-0">
              Creá tu primer ejercicio personalizado para usarlo en tus rutinas.
            </p>
            <Link href="/exercises/new" className="mt-sm">
              <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
                Crear ejercicio
              </Button>
            </Link>
          </div>
        </GradientSurface>
      ) : (
        <GradientSurface>
          <div
            className="flex flex-col"
            style={{ minHeight: ROW_HEIGHT * PER_PAGE }}
          >
            {exercises.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-sm py-5xl px-xl text-center">
                <Layers size={28} style={{ color: "var(--fg-tertiary)" }} />
                <p className="text-sm text-fg-secondary m-0">
                  No hay ejercicios que coincidan con los filtros.
                </p>
              </div>
            ) : (
              exercises.map((ex, idx) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  isLast={idx === exercises.length - 1}
                  suggesting={suggestingId === ex.id}
                  pending={pending[ex.id] ?? null}
                  accepting={acceptingId === ex.id}
                  onEdit={() => router.push(`/exercises/${ex.id}`)}
                  onDelete={() => setDeleteTarget(ex)}
                  onSuggest={() => handleSuggest(ex)}
                  onAccept={() => handleAcceptSuggestion(ex)}
                  onReject={() => handleRejectSuggestion(ex)}
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
    </div>
  );
}
