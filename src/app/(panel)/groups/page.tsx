"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Users, BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import { listGroups } from "@/lib/api/coaching";
import type { TrainingGroup, PaginationMeta } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonCircle } from "@/components/ui/Skeleton";

const PER_PAGE = 7;
/** Alto fijo de fila. */
const ROW_HEIGHT = 68;

// ─── Fila de grupo ──────────────────────────────────────────────────────────

interface GroupRowProps {
  group: TrainingGroup;
  isLast: boolean;
}

function GroupRow({ group, isLast }: GroupRowProps) {
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
        <Users size={18} style={{ color: "var(--primary)" }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg m-0 truncate">{group.name}</p>
        <div className="flex items-center gap-xs flex-wrap mt-xxs">
          <Badge variant="neutral" size="sm">
            {group.member_count}{" "}
            {group.member_count === 1 ? "alumno" : "alumnos"}
          </Badge>
          {group.assigned_planning_title && (
            <Badge variant="primary" size="sm">
              <span className="flex items-center gap-xxs">
                <BookOpen size={10} />
                {group.assigned_planning_title}
              </span>
            </Badge>
          )}
        </div>
      </div>

      <Link href={`/groups/${group.id}`} className="no-underline flex-shrink-0">
        <Button variant="secondary" size="sm" iconRight={<ChevronRight size={14} />}>
          Ver grupo
        </Button>
      </Link>
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
            <SkeletonLine width={96} height={30} className="rounded-pill" />
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

export default function GroupsPage() {
  const [groups, setGroups] = useState<TrainingGroup[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    per_page: PER_PAGE,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadGroups = useCallback(async (searchQuery: string, currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listGroups({
        page: currentPage,
        perPage: PER_PAGE,
        search: searchQuery || undefined,
      });
      setGroups(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar los grupos"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce búsqueda
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadGroups(search, 1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, loadGroups]);

  // Cambio de página
  useEffect(() => {
    loadGroups(search, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEmpty = !loading && groups.length === 0;

  return (
    <div className="flex flex-col gap-lg">
      {error && <ErrorBanner message={error} dismissible />}

      {/* Controles: buscador + nuevo grupo, en una sola línea */}
      <div className="flex items-center gap-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar grupo por nombre..."
          className="w-72 flex-shrink-0"
        />

        <Link href="/groups/new" className="ml-auto flex-shrink-0">
          <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
            Nuevo grupo
          </Button>
        </Link>
      </div>

      {/* Lista de grupos */}
      {loading ? (
        <ListSkeleton />
      ) : isEmpty && !search ? (
        <GradientSurface>
          <div className="flex flex-col items-center justify-center gap-sm py-5xl px-xl text-center">
            <Users size={28} style={{ color: "var(--fg-tertiary)" }} />
            <p className="text-base font-medium text-fg m-0">No tenés grupos aún</p>
            <p className="text-sm text-fg-secondary m-0">
              Creá tu primer grupo para organizar a tus alumnos.
            </p>
            <Link href="/groups/new" className="mt-sm">
              <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
                Crear grupo
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
            {isEmpty ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-sm py-5xl px-xl text-center">
                <Users size={28} style={{ color: "var(--fg-tertiary)" }} />
                <p className="text-sm text-fg-secondary m-0">
                  No hay grupos que coincidan con la búsqueda.
                </p>
              </div>
            ) : (
              groups.map((group, idx) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  isLast={idx === groups.length - 1}
                />
              ))
            )}
          </div>

          {/* Paginación — mismo componente, siempre visible, al pie del contenedor */}
          <div style={{ borderTop: "1px solid var(--separator-subtle)" }}>
            <Pagination
              page={pagination.page}
              perPage={pagination.per_page}
              total={pagination.total}
              onPageChange={setPage}
            />
          </div>
        </GradientSurface>
      )}
    </div>
  );
}
