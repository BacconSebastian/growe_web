"use client";

/**
 * CoachesList — lista de coaches del usuario autenticado.
 *
 * Vista de solo lectura. Carga con listCoaches() y muestra nombre/avatar
 * de cada coach. Un coach raramente tiene coaches propios, pero el panel
 * los muestra para paridad con el mobile (app/friends.tsx sección "Mis coaches").
 *
 * Paginación: usa el patrón estándar del web con PaginationMeta del backend.
 * El backend soporta ?page= y ?limit= en GET /coaching/coaches.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { listCoaches } from "@/lib/api/coaching";
import { getErrorMessage, getDisplayName } from "@/lib/utils";
import { useAliases } from "@/contexts/AliasContext";
import type { CoachesListResponse } from "@/lib/api/coaching";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PER_PAGE = 10;

// ─── Tipos locales ────────────────────────────────────────────────────────────

type CoachItem = CoachesListResponse["items"][number];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CoachesListProps {
  className?: string;
}

// ─── Skeleton de fila ─────────────────────────────────────────────────────────

const RowSkeleton: React.FC<{ isLast?: boolean }> = ({ isLast = false }) => (
  <div
    className="flex items-center gap-md py-md"
    style={
      isLast ? undefined : { borderBottom: "1px solid var(--separator-subtle)" }
    }
  >
    <SkeletonCircle size={36} />
    <div className="flex flex-col gap-xs flex-1">
      <SkeletonLine width="45%" height={14} />
      <SkeletonLine width="28%" height={12} />
    </div>
  </div>
);

// ─── Fila de coach ────────────────────────────────────────────────────────────

interface CoachRowProps {
  coach: CoachItem;
  isLast: boolean;
}

const CoachRow: React.FC<CoachRowProps> = ({ coach, isLast }) => {
  const { aliases } = useAliases();
  const displayName = getDisplayName({
    id: coach.id,
    first_name: coach.first_name,
    last_name: coach.last_name,
    username: coach.username,
  }, aliases);

  const username = `@${coach.username}`;

  const initials = (
    coach.first_name?.[0] ??
    coach.username[0] ??
    "?"
  ).toUpperCase();

  return (
    <div
      className="flex items-center gap-md py-md"
      style={
        isLast ? undefined : { borderBottom: "1px solid var(--separator-subtle)" }
      }
    >
      <Avatar
        src={coach.avatar_url}
        initials={initials}
        alt={displayName}
        size="md"
      />

      <div className="flex flex-col gap-xxs flex-1 min-w-0">
        <span className="text-sm font-semibold text-fg truncate">
          {displayName}
        </span>
        <span className="text-xs text-fg-tertiary truncate">{username}</span>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const CoachesList: React.FC<CoachesListProps> = ({ className = "" }) => {
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);

  const load = useCallback(async (targetPage: number) => {
    const isFirst = targetPage === 1;
    if (isFirst) {
      setLoading(true);
    } else {
      setLoadingPage(true);
    }
    setError(null);

    try {
      const res = await listCoaches({ page: targetPage, limit: PER_PAGE });
      setCoaches(res.items);
      // PaginationMeta usa total_pages
      const tp = res.pagination.total_pages ?? 1;
      setTotalPages(tp);
      setPage(targetPage);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar tus coaches."));
    } finally {
      setLoading(false);
      setLoadingPage(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  // ─── Skeleton inicial ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={className}>
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton isLast />
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className={className}>
        <ErrorBanner message={error} />
      </div>
    );
  }

  // ─── Empty state ───────────────────────────────────────────────────────────

  if (coaches.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<Users size={24} />}
          title="Sin coaches"
          description="Cuando un coach te agregue como alumno aparecerá aquí."
        />
      </div>
    );
  }

  // ─── Lista con paginación ──────────────────────────────────────────────────

  return (
    <div className={className}>
      <div>
        {coaches.map((coach, index) => (
          <CoachRow
            key={coach.id}
            coach={coach}
            isLast={index === coaches.length - 1 && totalPages === 1}
          />
        ))}
      </div>

      {/* Paginación — solo si hay más de una página */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-md mt-md" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
          <span className="text-xs text-fg-tertiary">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loadingPage}
              loading={loadingPage && page > 1}
              onClick={() => load(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loadingPage}
              loading={loadingPage && page < totalPages}
              onClick={() => load(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
