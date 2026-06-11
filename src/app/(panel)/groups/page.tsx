"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { listGroups } from "@/lib/api/coaching";
import type { TrainingGroup } from "@/lib/api/types";
import type { PaginationMeta } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/utils";
import { GroupCard } from "@/components/groups/GroupCard";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonBox } from "@/components/ui/Skeleton";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GroupsSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-lg p-xl flex items-center gap-lg"
          style={{
            background: "var(--card)",
            border: "1px solid var(--separator-subtle)",
          }}
        >
          <SkeletonBox width={44} height={44} className="rounded-pill flex-shrink-0" />
          <div className="flex flex-col gap-sm flex-1">
            <SkeletonLine width={160} height={16} />
            <SkeletonLine width={100} height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Summary stats ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  totalGroups: number;
  totalMembers: number;
}

function SummaryCards({ totalGroups, totalMembers }: SummaryCardsProps) {
  const items = [
    { label: "Grupos", value: totalGroups, icon: <Users size={16} /> },
    { label: "Total alumnos", value: totalMembers, icon: <Users size={16} style={{ color: "var(--accent, var(--primary))" }} /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-md mb-xl">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg p-xl flex flex-col gap-sm"
          style={{
            background: "var(--card)",
            border: "1px solid var(--separator-subtle)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center gap-sm">
            <div
              className="w-7 h-7 rounded-pill flex items-center justify-center"
              style={{ background: "var(--primary-alpha-12)" }}
            >
              <span style={{ color: "var(--primary)" }}>{item.icon}</span>
            </div>
            <span className="text-xl font-bold text-fg">{item.value}</span>
          </div>
          <span className="text-xs text-fg-tertiary">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GroupsPage() {
  const [groups, setGroups] = useState<TrainingGroup[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
  });
  const [totalMembers, setTotalMembers] = useState(0);
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
        perPage: 10,
        search: searchQuery || undefined,
      });
      setGroups(res.items);
      setPagination(res.pagination);
      setTotalMembers(res.totalMembers);
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
    <div className="flex flex-col gap-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-lg flex-wrap">
        <div>
          <h1
            className="text-display font-bold tracking-tight"
            style={{ margin: 0, letterSpacing: "-0.4px" }}
          >
            Grupos
          </h1>
          <p className="text-base text-fg-secondary mt-xs m-0">
            Organizá tus alumnos en grupos de entrenamiento
          </p>
        </div>
        <Link href="/groups/new">
          <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
            Nuevo grupo
          </Button>
        </Link>
      </div>

      {error && <ErrorBanner message={error} dismissible />}

      {/* Summary */}
      {!loading && groups.length > 0 && (
        <SummaryCards totalGroups={pagination.total} totalMembers={totalMembers} />
      )}

      {/* Buscador */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre..."
        className="w-full max-w-xs"
      />

      {/* Lista */}
      {loading ? (
        <GroupsSkeleton />
      ) : isEmpty ? (
        <EmptyState
          icon={<Users size={24} />}
          title={search ? "Sin resultados" : "No tenés grupos aún"}
          description={
            search
              ? "Probá con otro nombre."
              : "Creá tu primer grupo para organizar a tus alumnos."
          }
          action={
            !search ? (
              <Link href="/groups/new">
                <Button variant="primary" iconLeft={<Plus size={16} />}>
                  Crear grupo
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-md">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>

          {pagination.total_pages > 1 && (
            <Pagination
              page={pagination.page}
              perPage={pagination.per_page}
              total={pagination.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
