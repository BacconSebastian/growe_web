"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Clock } from "lucide-react";
import { listStudentLogs } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import type { FriendWorkoutLogData, PaginationMeta } from "@/lib/api/types";

interface StudentHistoryTabProps {
  studentId: number;
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-md p-xl rounded-lg"
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          <SkeletonBox width={44} height={44} />
          <div className="flex flex-col gap-xs flex-1">
            <SkeletonLine width={160} height={14} />
            <SkeletonLine width={110} height={11} />
          </div>
          <SkeletonLine width={60} height={14} />
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface WorkoutLogRowProps {
  log: FriendWorkoutLogData;
}

function WorkoutLogRow({ log }: WorkoutLogRowProps) {
  const routineTitle = log.routine?.title ?? "Entrenamiento libre";
  const date = formatDate(log.performed_at);
  const duration = log.duration_minutes
    ? `${log.duration_minutes} min`
    : null;
  const exerciseCount = log.routine_snapshot?.exercises?.length ?? 0;

  return (
    <div
      className="flex items-center gap-lg p-xl rounded-lg"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
      }}
    >
      {/* Ícono */}
      <div
        className="w-11 h-11 rounded-pill flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--primary-alpha-12)", color: "var(--primary)" }}
      >
        <Clock size={18} />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-xxs flex-1 min-w-0">
        <span className="text-sm font-semibold text-fg truncate">
          {routineTitle}
        </span>
        <span className="text-xs text-fg-tertiary">{date}</span>
      </div>

      {/* Meta derecha */}
      <div className="flex flex-col items-end gap-xxs flex-shrink-0">
        {duration && (
          <span className="text-sm font-medium text-fg">{duration}</span>
        )}
        {exerciseCount > 0 && (
          <span className="text-xs text-fg-tertiary">
            {exerciseCount} ejercicio(s)
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * StudentHistoryTab — lista paginada de workouts completados del alumno.
 */
export const StudentHistoryTab: React.FC<StudentHistoryTabProps> = ({
  studentId,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<FriendWorkoutLogData[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  });
  const [page, setPage] = useState(1);

  const load = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStudentLogs(studentId, { page: currentPage });
      setLogs(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el historial"));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  if (loading) return <HistorySkeleton />;
  if (error) return <ErrorBanner message={error} />;

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={24} />}
        title="Sin historial"
        description="Este alumno aún no tiene entrenamientos registrados."
      />
    );
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-sm">
        {logs.map((log) => (
          <WorkoutLogRow key={log.id} log={log} />
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
    </div>
  );
};
