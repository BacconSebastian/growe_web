"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Trophy, Flame, BarChart2, Star } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SearchInput } from "@/components/ui/SearchInput";
import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";
import { getGroupLeaderboard } from "@/lib/api/coaching";
import type { LeaderboardEntry } from "@/lib/api/types";
import { getErrorMessage, getDisplayName, getUserInitials } from "@/lib/utils";
import { useAliases } from "@/contexts/AliasContext";

type SortBy = "workouts" | "streak" | "volume";
type Period = "week" | "15days" | "month";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "workouts", label: "Entrenos" },
  { value: "streak", label: "Racha" },
  { value: "volume", label: "Volumen" },
];

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "week", label: "Esta semana" },
  { value: "15days", label: "Últimos 15 días" },
  { value: "month", label: "Últimos 30 días" },
];

const SEARCH_THRESHOLD = 8;
const PER_PAGE = 5;

// Colores para los 3 primeros puestos
const RANK_COLORS: Record<number, string> = {
  1: "var(--rank-1, #F59E0B)",
  2: "var(--rank-2, #9CA3AF)",
  3: "var(--rank-3, #B45309)",
};

function formatMetricValue(entry: LeaderboardEntry, sortBy: SortBy): string {
  switch (sortBy) {
    case "workouts":
      return `${entry.workouts_count} entrenos`;
    case "streak":
      return `${entry.current_streak} días de racha`;
    case "volume":
      return `${entry.total_volume.toLocaleString("es-AR")} kg`;
    default:
      return "";
  }
}

function LeaderboardSkeleton() {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--separator-subtle)" }}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-md px-xl py-md"
          style={{
            borderBottom: i < 3 ? "1px solid var(--separator-subtle)" : "none",
          }}
        >
          <SkeletonCircle size={36} />
          <div className="flex flex-col gap-xs flex-1">
            <SkeletonLine width={140} height={14} />
            <SkeletonLine width={90} height={12} />
          </div>
          <SkeletonLine width={60} height={20} />
        </div>
      ))}
    </div>
  );
}

interface GroupLeaderboardProps {
  groupId: number;
}

/**
 * GroupLeaderboard — ranking del grupo con sort_by/period seleccionables.
 * Paginación client-side + búsqueda opcional.
 */
export const GroupLeaderboard: React.FC<GroupLeaderboardProps> = ({ groupId }) => {
  const { aliases } = useAliases();
  const [sortBy, setSortBy] = useState<SortBy>("workouts");
  const [period, setPeriod] = useState<Period>("week");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getGroupLeaderboard(groupId, sortBy, period);
      setEntries(res.ranking);
    } catch (err) {
      setError(getErrorMessage(err, "Error al cargar el ranking"));
    } finally {
      setLoading(false);
    }
  }, [groupId, sortBy, period]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(
      (e) =>
        getDisplayName({ ...e.student, id: e.student.id }, aliases).toLowerCase().includes(term) ||
        e.student.username.toLowerCase().includes(term)
    );
  }, [entries, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedEntries = filteredEntries.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );

  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <h2 className="text-lg font-semibold text-fg m-0">Ranking</h2>

      {/* Filtros */}
      <div className="flex items-center gap-md flex-wrap">
        {/* Sort By */}
        <div className="flex items-center gap-xs">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setSortBy(opt.value); setPage(1); }}
              className="px-md py-xs rounded-pill text-sm font-medium transition-colors"
              style={{
                background:
                  sortBy === opt.value
                    ? "var(--primary)"
                    : "var(--fill-tertiary)",
                color:
                  sortBy === opt.value
                    ? "var(--on-primary)"
                    : "var(--fg-secondary)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Period */}
        <div
          className="flex items-center rounded-md overflow-hidden"
          style={{ border: "1px solid var(--separator-subtle)" }}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setPeriod(opt.value); setPage(1); }}
              className="px-md py-xs text-xs font-medium transition-colors whitespace-nowrap"
              style={{
                background:
                  period === opt.value
                    ? "var(--primary-alpha-12)"
                    : "transparent",
                color:
                  period === opt.value
                    ? "var(--primary)"
                    : "var(--fg-tertiary)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Búsqueda */}
      {!loading && entries.length > SEARCH_THRESHOLD && (
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Buscar por nombre..."
        />
      )}

      {/* Error */}
      {error && <ErrorBanner message={error} />}

      {/* Contenido */}
      {loading ? (
        <LeaderboardSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Trophy size={24} />}
          title="Sin datos de ranking"
          description="Los datos aparecerán cuando los miembros empiecen a entrenar."
        />
      ) : search.trim() !== "" && filteredEntries.length === 0 ? (
        <p className="text-sm text-fg-secondary text-center py-xl">
          No encontramos resultados para esa búsqueda.
        </p>
      ) : (
        <>
          <div
            className="rounded-lg overflow-hidden"
            style={{
              background: "var(--card)",
              border: "1px solid var(--separator-subtle)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {pagedEntries.map((entry, idx) => {
              const isTopThree = entry.rank <= 3;
              const initials = getUserInitials(entry.student);
              const displayName = getDisplayName({ ...entry.student, id: entry.student.id }, aliases);
              const isLast = idx === pagedEntries.length - 1;
              const rankColor = RANK_COLORS[entry.rank] ?? "var(--primary)";

              return (
                <Link
                  key={entry.student.id}
                  href={`/students/${entry.student.id}`}
                  className="flex items-center gap-md px-xl py-md no-underline transition-colors hover:bg-fill-quaternary"
                  style={{
                    borderBottom: isLast
                      ? "none"
                      : "1px solid var(--separator-subtle)",
                    display: "flex",
                  }}
                >
                  {/* Avatar + badge de posición */}
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={entry.student.avatar_url}
                      initials={initials}
                      size="md"
                    />
                    <div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-pill flex items-center justify-center"
                      style={{
                        background: isTopThree ? "transparent" : "var(--primary-alpha-12)",
                        border: isTopThree ? "none" : "1px solid var(--separator-subtle)",
                      }}
                    >
                      {isTopThree ? (
                        <Star size={14} color={rankColor} fill={rankColor} />
                      ) : (
                        <span
                          className="text-xs font-bold"
                          style={{ color: "var(--primary)", fontSize: "9px" }}
                        >
                          {entry.rank}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium text-fg truncate">
                      {displayName}
                    </span>
                    <span className="text-xs text-fg-tertiary">
                      {formatMetricValue(entry, sortBy)}
                    </span>
                  </div>

                  {/* Ícono de métrica */}
                  <span className="flex-shrink-0">
                    {sortBy === "streak" ? (
                      <Flame size={16} style={{ color: "var(--warning)" }} />
                    ) : sortBy === "volume" ? (
                      <BarChart2 size={16} style={{ color: "var(--primary)" }} />
                    ) : (
                      <Trophy size={16} style={{ color: "var(--accent, var(--primary))" }} />
                    )}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-md">
              <span className="text-xs text-fg-tertiary">
                Pág {safePage} de {totalPages}
              </span>
              <div className="flex items-center gap-sm">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-md py-xs rounded-pill text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--fill-tertiary)", color: "var(--fg)" }}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-md py-xs rounded-pill text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--fill-tertiary)", color: "var(--fg)" }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
