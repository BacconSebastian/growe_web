"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users,
  Activity,
  UserX,
  CalendarOff,
  CheckCircle,
} from "lucide-react";
import { getErrorMessage, getUserInitials } from "@/lib/utils";
import {
  getCoachDashboard,
  getCoachDashboardMetrics,
  getCoachAttention,
  listCoachingRequests,
  respondCoachingRequest,
  type CoachDashboardData,
  type CoachDashboardMetrics,
  type CoachingRequestsResponse,
  type CoachAttentionResponse,
} from "@/lib/api/coaching";
import { listRoutines } from "@/lib/api/routines";
import { listPlannings } from "@/lib/api/plannings";
import { NeedsAttentionCard } from "@/components/coaching/NeedsAttentionCard";
import { DraftsCard, type DraftItem } from "@/components/coaching/DraftsCard";
import {
  MetricDetailModal,
  type MetricDetailItem,
} from "@/components/coaching/MetricDetailModal";
import { StatCard } from "@/components/ui/StatCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { GradientSurface } from "@/components/ui/GradientSurface";
import { Pagination } from "@/components/ui/Pagination";
import { OutgoingRequestsList } from "@/components/coaching/OutgoingRequestsList";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formato relativo "Hace X días" a partir de una fecha ISO. */
function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Sin entrenamientos";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`;
  return `Hace ${Math.floor(days / 30)} mes(es)`;
}

/** Métricas con detalle clickeable. */
type MetricKey = "total" | "active" | "inactive" | "no_planning";

/** Solicitudes pendientes por página. */
const PENDING_PER_PAGE = 2;
/** Alto mínimo del cuerpo de solicitudes (≈ 2 filas) para tamaño constante. */
const PENDING_BODY_MIN_HEIGHT = 152;

// ─── Skeleton del dashboard ──────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-lg">
      {/* Stat cards (4) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-lg">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBox key={i} height={96} />
        ))}
      </div>

      {/* Grid principal — espeja las alturas reales (≈520px de alto de columna):
          izquierda = Solicitudes (264) + Borradores (240); derecha = Necesitan
          atención (col-span-2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="flex flex-col gap-lg">
          <SkeletonBox height={264} />
          <SkeletonBox height={240} />
        </div>
        <SkeletonBox height={520} className="lg:col-span-2" />
      </div>
    </div>
  );
}

// ─── Card de solicitud de coaching ──────────────────────────────────────────

interface RequestCardProps {
  requests: CoachingRequestsResponse["incoming"];
  onRespond: (id: number, accepted: boolean) => Promise<void>;
  className?: string;
}

function PendingRequestsCard({ requests, onRespond, className }: RequestCardProps) {
  const pending = requests.filter((r) => r.status === "pending");
  const [page, setPage] = useState(1);

  const total = pending.length;
  const totalPages = Math.max(1, Math.ceil(total / PENDING_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visible = pending.slice(
    (currentPage - 1) * PENDING_PER_PAGE,
    currentPage * PENDING_PER_PAGE
  );

  return (
    <GradientSurface className={className}>
      <div
        className="flex items-center justify-between px-xl py-lg"
        style={{ borderBottom: "1px solid var(--separator-subtle)" }}
      >
        <h2 className="text-base font-semibold text-fg m-0">
          Solicitudes pendientes
        </h2>
        {total > 0 && (
          <Badge variant="warning" size="sm">
            {total}
          </Badge>
        )}
      </div>

      <div
        className="flex flex-col"
        style={{ minHeight: PENDING_BODY_MIN_HEIGHT }}
      >
        {total === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-sm px-xl py-xxl text-center">
            <CheckCircle size={28} style={{ color: "var(--success)" }} />
            <p className="text-sm text-fg-secondary m-0">
              No tenés solicitudes pendientes
            </p>
          </div>
        ) : (
          visible.map((req, idx) => {
            const sender = req.sender;
            const name = sender
              ? `${sender.first_name ?? ""} ${sender.last_name ?? ""}`.trim() ||
                sender.username
              : "Usuario desconocido";
            const initials = sender
              ? getUserInitials({
                  first_name: sender.first_name,
                  last_name: sender.last_name,
                  username: sender.username ?? "",
                })
              : "?";

            return (
              <div
                key={req.id}
                className="flex items-center gap-md px-xl py-lg"
                style={
                  idx < visible.length - 1
                    ? { borderBottom: "1px solid var(--separator-subtle)" }
                    : undefined
                }
              >
                <Avatar
                  src={sender?.avatar_url ?? null}
                  initials={initials}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg m-0 truncate">
                    {name}
                  </p>
                  {sender?.username && (
                    <p className="text-xs text-fg-tertiary m-0">
                      @{sender.username}
                    </p>
                  )}
                </div>
                <div className="flex gap-sm flex-shrink-0">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => onRespond(req.id, true)}
                  >
                    Aceptar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRespond(req.id, false)}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginación — siempre visible (deshabilitada si hay una sola página) */}
      <div style={{ borderTop: "1px solid var(--separator-subtle)" }}>
        <Pagination
          page={currentPage}
          perPage={PENDING_PER_PAGE}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </GradientSurface>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<CoachDashboardData | null>(null);
  const [metrics, setMetrics] = useState<CoachDashboardMetrics | null>(null);
  const [requests, setRequests] = useState<CoachingRequestsResponse | null>(null);
  const [attention, setAttention] = useState<CoachAttentionResponse | null>(null);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [openMetric, setOpenMetric] = useState<MetricKey | null>(null);

  // Best-effort: trae rutinas y planificaciones en estado borrador del coach.
  const loadDrafts = useCallback(async () => {
    try {
      const [draftRoutines, draftPlannings] = await Promise.all([
        listRoutines({ status: "draft" }),
        listPlannings({ status: "draft" }),
      ]);
      const items: DraftItem[] = [
        ...draftRoutines.items.map((r) => ({
          type: "routine" as const,
          id: r.id,
          title: r.title,
        })),
        ...draftPlannings.items.map((p) => ({
          type: "planning" as const,
          id: p.id,
          title: p.title,
        })),
      ];
      setDrafts(items);
    } catch {
      setDrafts([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, met, reqs] = await Promise.all([
        getCoachDashboard(),
        getCoachDashboardMetrics(),
        listCoachingRequests(),
      ]);
      setDashboard(dash);
      setMetrics(met);
      setRequests(reqs);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar los datos del dashboard"));
    } finally {
      setLoading(false);
    }
    // "Necesitan atención" es best-effort: si el endpoint no está disponible
    // (backend sin deploy) no debe tumbar el resto del dashboard.
    try {
      setAttention(await getCoachAttention());
    } catch {
      setAttention(null);
    }
    loadDrafts();
  }, [loadDrafts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Items detrás de la métrica abierta (derivados de datos ya cargados).
  const metricModal = useMemo<{ title: string; items: MetricDetailItem[] } | null>(() => {
    if (!openMetric) return null;

    const students = dashboard?.students ?? [];
    const toItem = (s: CoachDashboardData["students"][number]): MetricDetailItem => ({
      id: s.id,
      name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.username,
      initials: getUserInitials({
        first_name: s.first_name,
        last_name: s.last_name,
        username: s.username,
      }),
      avatar_url: s.avatar_url,
      detail: formatTimeAgo(s.last_workout_at),
    });

    switch (openMetric) {
      case "total":
        return { title: "Total de alumnos", items: students.map(toItem) };
      case "active":
        return {
          title: "Activos esta semana",
          items: students.filter((s) => s.current_streak > 0).map(toItem),
        };
      case "inactive":
        return {
          title: "Inactivos esta semana",
          items: students.filter((s) => s.current_streak === 0).map(toItem),
        };
      case "no_planning":
        return {
          title: "Usuarios sin planificación",
          items: (attention?.students ?? [])
            .filter((s) => s.without_planning)
            .map((s) => ({
              id: s.id,
              name:
                `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.username,
              initials: getUserInitials({
                first_name: s.first_name,
                last_name: s.last_name,
                username: s.username,
              }),
              avatar_url: s.avatar_url,
              detail: formatTimeAgo(s.last_workout_at),
            })),
        };
    }
  }, [openMetric, dashboard, attention]);

  const handleRespond = async (requestId: number, accepted: boolean) => {
    try {
      await respondCoachingRequest(requestId, accepted ? "accept" : "decline");
      // Refrescar solicitudes
      const reqs = await listCoachingRequests();
      setRequests(reqs);
      // Si aceptó, refrescar dashboard, métricas y atención para ver el nuevo alumno
      if (accepted) {
        const [dash, met] = await Promise.all([
          getCoachDashboard(),
          getCoachDashboardMetrics(),
        ]);
        setDashboard(dash);
        setMetrics(met);
        try {
          setAttention(await getCoachAttention());
        } catch {
          /* best-effort: no romper el flujo de aceptar solicitud */
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo responder la solicitud"));
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-lg">
      {error && <ErrorBanner message={error} dismissible />}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-lg">
        <StatCard
          label="Total de alumnos"
          value={metrics?.total_students ?? dashboard?.total_students ?? 0}
          icon={<Users size={18} />}
          iconColorClass="text-primary"
          onClick={() => setOpenMetric("total")}
        />
        <StatCard
          label="Activos esta semana"
          value={metrics?.students_active_this_week ?? 0}
          icon={<Activity size={18} />}
          iconColorClass="text-success"
          onClick={() => setOpenMetric("active")}
        />
        <StatCard
          label="Inactivos esta semana"
          value={metrics?.students_inactive_count ?? 0}
          icon={<UserX size={18} />}
          iconColorClass="text-warning"
          onClick={() => setOpenMetric("inactive")}
        />
        <StatCard
          label="Usuarios sin planificación"
          value={metrics?.students_without_planning ?? 0}
          icon={<CalendarOff size={18} />}
          iconColorClass="text-purple"
          onClick={() => setOpenMetric("no_planning")}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Solicitudes — justify-between reparte el espacio sobrante para que el
            borde inferior quede alineado con "Necesitan atención" */}
        <div className="flex flex-col gap-lg justify-between">
          {requests && (
            <PendingRequestsCard
              requests={requests.incoming}
              onRespond={handleRespond}
            />
          )}
          {requests && requests.outgoing.some((r) => r.status === "pending") && (
            <OutgoingRequestsList
              requests={requests.outgoing}
              onCancelled={loadData}
            />
          )}
          <DraftsCard items={drafts} />
        </div>

        {/* Necesitan atención */}
        {attention && (
          <NeedsAttentionCard students={attention.students} />
        )}
      </div>

      {/* Modal de detalle de métrica */}
      {metricModal && (
        <MetricDetailModal
          open={openMetric !== null}
          onClose={() => setOpenMetric(null)}
          title={metricModal.title}
          items={metricModal.items}
        />
      )}
    </div>
  );
}
