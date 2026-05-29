"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  Dumbbell,
  CalendarDays,
  Activity,
  UserPlus,
  CheckCircle,
  XCircle,
  Download,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getDisplayName, getErrorMessage, getUserInitials } from "@/lib/utils";
import {
  getCoachDashboard,
  getCoachDashboardMetrics,
  listCoachingRequests,
  respondCoachingRequest,
  type CoachDashboardData,
  type CoachDashboardMetrics,
  type CoachingRequestsResponse,
} from "@/lib/api/coaching";
import { StatCard } from "@/components/ui/StatCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonCircle, SkeletonBox } from "@/components/ui/Skeleton";
import { InviteStudentModal } from "@/components/students/InviteStudentModal";

// ─── Skeleton del dashboard ──────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-xxl">
      <div className="flex items-end justify-between gap-lg flex-wrap">
        <div className="flex flex-col gap-sm">
          <SkeletonLine width={240} height={32} />
          <SkeletonLine width={180} height={16} />
        </div>
        <div className="flex gap-sm">
          <SkeletonBox width={140} height={40} />
          <SkeletonBox width={140} height={40} />
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-lg">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBox key={i} height={100} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <SkeletonBox height={200} />
        <SkeletonBox height={200} className="lg:col-span-2" />
      </div>
    </div>
  );
}

// ─── Card de solicitud de coaching ──────────────────────────────────────────

interface RequestCardProps {
  requests: CoachingRequestsResponse["incoming"];
  onRespond: (id: number, accepted: boolean) => Promise<void>;
}

function PendingRequestsCard({ requests, onRespond }: RequestCardProps) {
  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div
      className="flex flex-col rounded-lg"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="flex items-center justify-between px-xl py-lg"
        style={{ borderBottom: "1px solid var(--separator-subtle)" }}
      >
        <h2 className="text-base font-semibold text-fg m-0">
          Solicitudes pendientes
        </h2>
        {pending.length > 0 && (
          <Badge variant="warning" size="sm">
            {pending.length}
          </Badge>
        )}
      </div>

      <div className="flex flex-col">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center gap-sm px-xl py-xxl text-center">
            <CheckCircle size={28} style={{ color: "var(--success)" }} />
            <p className="text-sm text-fg-secondary m-0">
              No tenés solicitudes pendientes
            </p>
          </div>
        ) : (
          pending.slice(0, 5).map((req, idx) => {
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
                  idx < pending.length - 1
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
    </div>
  );
}

// ─── Card de alumnos recientes ───────────────────────────────────────────────

interface RecentStudentsCardProps {
  students: CoachDashboardData["students"];
}

function RecentStudentsCard({ students }: RecentStudentsCardProps) {
  const recent = students.slice(0, 5);

  function formatTimeAgo(dateStr: string | null): string {
    if (!dateStr) return "Sin entrenamientos";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "Hoy";
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`;
    return `Hace ${Math.floor(days / 30)} mes(es)`;
  }

  return (
    <div
      className="flex flex-col rounded-lg lg:col-span-2"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="flex items-center justify-between px-xl py-lg"
        style={{ borderBottom: "1px solid var(--separator-subtle)" }}
      >
        <h2 className="text-base font-semibold text-fg m-0">
          Alumnos recientes
        </h2>
        <Link
          href="/students"
          className="text-sm text-primary font-medium no-underline flex items-center gap-xxs hover:opacity-80 transition-opacity"
        >
          Ver todos
          <ChevronRight size={14} />
        </Link>
      </div>

      <div className="flex flex-col">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-sm px-xl py-xxl text-center">
            <Users size={28} style={{ color: "var(--fg-tertiary)" }} />
            <p className="text-sm text-fg-secondary m-0">
              Todavía no tenés alumnos
            </p>
          </div>
        ) : (
          recent.map((student, idx) => {
            const name = `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || student.username;
            const initials = getUserInitials({
              first_name: student.first_name,
              last_name: student.last_name,
              username: student.username,
            });
            const adherence = student.weekly_adherence_percentage;

            return (
              <Link
                key={student.id}
                href={`/students/${student.id}`}
                className="no-underline"
              >
                <div
                  className="flex items-center gap-md px-xl py-lg transition-colors duration-100 cursor-pointer"
                  style={
                    idx < recent.length - 1
                      ? { borderBottom: "1px solid var(--separator-subtle)" }
                      : undefined
                  }
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "var(--fill-quaternary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "";
                  }}
                >
                  <Avatar
                    src={student.avatar_url}
                    initials={initials}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg m-0 truncate">
                      {name}
                    </p>
                    <p className="text-xs text-fg-tertiary m-0">
                      {formatTimeAgo(student.last_workout_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-md flex-shrink-0">
                    {student.needs_attention && (
                      <Badge variant="warning" size="sm">
                        Atención
                      </Badge>
                    )}
                    {adherence !== null && (
                      <span className="text-sm font-semibold text-fg-secondary">
                        {Math.round(adherence)}%
                      </span>
                    )}
                    <span className="text-xs text-fg-tertiary">
                      {student.workouts_this_week}
                      {" "}ent./sem.
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Quick Access Cards ───────────────────────────────────────────────────────

function QuickAccessCards() {
  const cards = [
    {
      href: "/students",
      label: "Alumnos",
      description: "Gestioná tu plantel",
      icon: <Users size={18} />,
      iconBg: "var(--primary-alpha-16)",
      iconColor: "var(--primary)",
    },
    {
      href: "/routines",
      label: "Rutinas",
      description: "Mis plantillas",
      icon: <Dumbbell size={18} />,
      iconBg: "var(--warning-alpha-20)",
      iconColor: "var(--warning)",
    },
    {
      href: "/plannings",
      label: "Planificaciones",
      description: "Ciclos y semanas",
      icon: <CalendarDays size={18} />,
      iconBg: "var(--purple-alpha-16)",
      iconColor: "var(--purple)",
    },
  ];

  return (
    <div
      className="flex flex-col rounded-lg"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="px-xl py-lg"
        style={{ borderBottom: "1px solid var(--separator-subtle)" }}
      >
        <h2 className="text-base font-semibold text-fg m-0">Accesos rápidos</h2>
      </div>
      <div className="flex flex-col gap-sm p-xl">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="no-underline">
            <div
              className="relative flex items-center gap-md p-lg rounded-md overflow-hidden cursor-pointer transition-opacity duration-150 hover:opacity-90"
              style={{
                background: "var(--fill-tertiary)",
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                }}
              />
              <div
                className="relative w-9 h-9 rounded-pill flex items-center justify-center flex-shrink-0"
                style={{ background: card.iconBg, color: card.iconColor }}
              >
                {card.icon}
              </div>
              <div className="relative min-w-0">
                <p className="text-sm font-semibold text-fg m-0">{card.label}</p>
                <p className="text-xs text-fg-secondary m-0">{card.description}</p>
              </div>
              <ChevronRight
                size={14}
                className="relative ml-auto text-fg-tertiary flex-shrink-0"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user ? getDisplayName(user).split(" ")[0] : "Coach";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<CoachDashboardData | null>(null);
  const [metrics, setMetrics] = useState<CoachDashboardMetrics | null>(null);
  const [requests, setRequests] = useState<CoachingRequestsResponse | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRespond = async (requestId: number, accepted: boolean) => {
    try {
      await respondCoachingRequest(requestId, accepted);
      // Refrescar solicitudes
      const reqs = await listCoachingRequests();
      setRequests(reqs);
      // Si aceptó, refrescar dashboard para ver el nuevo alumno
      if (accepted) {
        const [dash, met] = await Promise.all([
          getCoachDashboard(),
          getCoachDashboardMetrics(),
        ]);
        setDashboard(dash);
        setMetrics(met);
      }
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo responder la solicitud"));
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-xxl">
      {/* Header */}
      <div className="flex items-start justify-between gap-lg flex-wrap">
        <div>
          <h1
            className="text-display font-bold tracking-tight"
            style={{ margin: 0, letterSpacing: "-0.4px" }}
          >
            Hola, {displayName}
          </h1>
          <p className="text-base text-fg-secondary mt-xs m-0">
            Resumen de tu plantel
          </p>
        </div>
        <div className="flex gap-sm flex-shrink-0">
          <Button
            variant="secondary"
            size="md"
            iconLeft={<Download size={16} />}
            onClick={() => alert("Exportar reporte — próximamente")}
          >
            Exportar reporte
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft={<UserPlus size={16} />}
            onClick={() => setInviteOpen(true)}
          >
            Invitar alumno
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} dismissible />}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-lg">
        <StatCard
          label="Total de alumnos"
          value={metrics?.total_students ?? dashboard?.total_students ?? 0}
          icon={<Users size={18} />}
          iconColorClass="text-primary"
        />
        <StatCard
          label="Activos esta semana"
          value={metrics?.students_active_this_week ?? 0}
          icon={<Activity size={18} />}
          iconColorClass="text-success"
        />
        <StatCard
          label="Rutinas creadas"
          value={metrics?.total_routines ?? "—"}
          icon={<Dumbbell size={18} />}
          iconColorClass="text-warning"
        />
        <StatCard
          label="Plannings activos"
          value={metrics?.active_plannings ?? "—"}
          icon={<CalendarDays size={18} />}
          iconColorClass="text-purple"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Solicitudes + Quick Access */}
        <div className="flex flex-col gap-lg">
          {requests && (
            <PendingRequestsCard
              requests={requests.incoming}
              onRespond={handleRespond}
            />
          )}
          <QuickAccessCards />
        </div>

        {/* Alumnos recientes */}
        {dashboard && (
          <RecentStudentsCard students={dashboard.students} />
        )}
      </div>

      {/* Modal invitar */}
      <InviteStudentModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => {
          setInviteOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
