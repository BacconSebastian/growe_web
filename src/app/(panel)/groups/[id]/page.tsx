"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { SkeletonLine, SkeletonBox, SkeletonCircle } from "@/components/ui/Skeleton";
import { GroupMembersPanel } from "@/components/groups/GroupMembersPanel";
import { GroupLeaderboard } from "@/components/groups/GroupLeaderboard";
import { AddMembersModal } from "@/components/groups/AddMembersModal";
import { AssignPlanningModal } from "@/components/groups/AssignPlanningModal";
import { GroupForm, type GroupFormValues } from "@/components/groups/GroupForm";
import {
  getGroup,
  deleteGroup,
  updateGroup,
  unassignGroupPlanning,
} from "@/lib/api/coaching";
import type { TrainingGroupDetail, AssignGroupPlanningResult } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/utils";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GroupDetailSkeleton() {
  return (
    <div className="flex flex-col gap-xl">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-md">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-lg p-xl flex flex-col gap-sm"
            style={{ background: "var(--card)", border: "1px solid var(--separator-subtle)" }}
          >
            <div className="flex items-center gap-sm">
              <SkeletonCircle size={28} />
              <SkeletonLine width={40} height={20} />
            </div>
            <SkeletonLine width={80} height={12} />
          </div>
        ))}
      </div>
      {/* Info card */}
      <div
        className="rounded-lg p-xl flex flex-col gap-md"
        style={{ background: "var(--card)", border: "1px solid var(--separator-subtle)" }}
      >
        <div className="flex items-center gap-md">
          <SkeletonCircle size={48} />
          <div className="flex flex-col gap-xs flex-1">
            <SkeletonLine width={180} height={18} />
            <SkeletonLine width={120} height={12} />
          </div>
        </div>
        <SkeletonLine width="70%" height={14} />
        <div className="flex gap-sm">
          <SkeletonBox width="48%" height={36} className="rounded-pill" />
          <SkeletonBox width="48%" height={36} className="rounded-pill" />
        </div>
      </div>
      {/* Members header */}
      <div className="flex items-center justify-between">
        <SkeletonLine width={100} height={20} />
        <SkeletonBox width={90} height={32} className="rounded-pill" />
      </div>
      {/* Members list */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--separator-subtle)" }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-md px-xl py-md"
            style={{ borderBottom: i < 3 ? "1px solid var(--separator-subtle)" : "none" }}
          >
            <SkeletonCircle size={36} />
            <div className="flex flex-col gap-xs flex-1">
              <SkeletonLine width={140} height={14} />
              <SkeletonLine width={90} height={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Resultado de asignación ──────────────────────────────────────────────────

function formatAssignedAt(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `Asignada el ${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "";
  }
}

function formatCreatedAt(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `Creado el ${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "";
  }
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const groupId = Number(params.id);

  const [group, setGroup] = useState<TrainingGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal states
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [assignPlanningOpen, setAssignPlanningOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [unassignConfirmOpen, setUnassignConfirmOpen] = useState(false);
  const [planningActionsOpen, setPlanningActionsOpen] = useState(false);
  const [assignResults, setAssignResults] = useState<AssignGroupPlanningResult[] | null>(null);
  const [assignResultsOpen, setAssignResultsOpen] = useState(false);

  // Action loading states
  const [deleting, setDeleting] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    if (!groupId || isNaN(groupId)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getGroup(groupId);
      setGroup(data);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el grupo"));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const handleDeleteGroup = async () => {
    setDeleting(true);
    setActionError(null);
    try {
      await deleteGroup(groupId);
      router.replace("/groups");
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo eliminar el grupo"));
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleUnassignPlanning = async () => {
    setUnassigning(true);
    setActionError(null);
    try {
      await unassignGroupPlanning(groupId);
      setUnassignConfirmOpen(false);
      await loadGroup();
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo desactivar la planificación"));
      setUnassignConfirmOpen(false);
    } finally {
      setUnassigning(false);
    }
  };

  const handleEditSubmit = async (values: GroupFormValues) => {
    setEditError(null);
    try {
      await updateGroup(groupId, {
        name: values.name,
        description: values.description || undefined,
      });
      setEditGroupOpen(false);
      await loadGroup();
    } catch (err) {
      setEditError(getErrorMessage(err, "Error al actualizar el grupo"));
      throw err;
    }
  };

  if (!groupId || isNaN(groupId)) {
    return (
      <div className="flex flex-col gap-xl">
        <ErrorBanner message="ID de grupo inválido" />
      </div>
    );
  }

  if (!loading && error && !group) {
    return (
      <div className="flex flex-col gap-xl">
        <div className="flex items-center gap-md">
          <Link href="/groups" className="text-sm text-fg-tertiary hover:text-fg">
            Grupos
          </Link>
          <span className="text-fg-quaternary">/</span>
          <span className="text-sm text-fg-secondary">Error</span>
        </div>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-sm text-sm">
        <Link href="/groups" className="text-fg-tertiary hover:text-fg transition-colors">
          Grupos
        </Link>
        <ChevronRight size={14} style={{ color: "var(--fg-quaternary)" }} />
        <span className="text-fg-secondary">
          {loading ? "..." : (group?.name ?? "Grupo")}
        </span>
      </div>

      {actionError && <ErrorBanner message={actionError} dismissible />}

      {/* Contenido principal */}
      {loading ? (
        <GroupDetailSkeleton />
      ) : group ? (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-md">
            {[
              {
                label: "Miembros",
                value: group.member_count,
                color: "var(--primary)",
                bg: "var(--primary-alpha-12)",
                icon: <Users size={14} />,
              },
              {
                label: "Planificación",
                value: group.assigned_planning_title ? "1" : "0",
                color: group.assigned_planning_title ? "var(--success)" : "var(--warning)",
                bg: group.assigned_planning_title
                  ? "var(--success-alpha-12)"
                  : "var(--warning-alpha-20)",
                icon: <BookOpen size={14} />,
              },
            ].map((stat) => (
              <div
                key={stat.label}
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
                    style={{ background: stat.bg }}
                  >
                    <span style={{ color: stat.color }}>{stat.icon}</span>
                  </div>
                  <span className="text-xl font-bold text-fg">{stat.value}</span>
                </div>
                <span className="text-xs text-fg-tertiary">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Info card */}
          <div
            className="rounded-lg p-xl flex flex-col gap-md"
            style={{
              background: "var(--card)",
              border: "1px solid var(--separator-subtle)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center gap-md">
              <div
                className="w-12 h-12 rounded-pill flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--primary-alpha-12)" }}
              >
                <Users size={22} style={{ color: "var(--primary)" }} />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-lg font-semibold text-fg">{group.name}</span>
                {group.created_at && (
                  <span className="text-xs text-fg-tertiary">
                    {formatCreatedAt(group.created_at)}
                  </span>
                )}
              </div>
              {/* Menú de acciones */}
              <button
                type="button"
                onClick={() => setEditGroupOpen(true)}
                className="text-xs font-medium px-md py-xs rounded-pill transition-colors hover:bg-fill-tertiary"
                style={{ color: "var(--fg-secondary)" }}
              >
                Editar
              </button>
            </div>

            {group.description && (
              <p className="text-sm text-fg-secondary m-0">{group.description}</p>
            )}

            <div
              className="flex flex-col gap-sm pt-md"
              style={{ borderTop: "1px solid var(--separator-subtle)" }}
            >
              <div className="flex gap-sm">
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={<Plus size={14} />}
                  onClick={() => setAddMembersOpen(true)}
                  className="flex-1"
                >
                  Agregar miembros
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={<BookOpen size={14} />}
                  onClick={() => {
                    if (group.assigned_planning_title) {
                      setPlanningActionsOpen(true);
                    } else {
                      setAssignPlanningOpen(true);
                    }
                  }}
                  className="flex-1"
                >
                  {group.assigned_planning_title ? "Reasignar" : "Asignar plan"}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconLeft={<Trash2 size={14} />}
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full"
                style={{ color: "var(--destructive)" }}
              >
                Eliminar grupo
              </Button>
            </div>
          </div>

          {/* Planning activa */}
          {group.assigned_planning_title && (
            <div className="flex flex-col gap-md">
              <div className="flex items-center justify-between gap-md">
                <h2 className="text-lg font-semibold text-fg m-0">Planificación activa</h2>
                <button
                  type="button"
                  onClick={() => setPlanningActionsOpen(true)}
                  className="p-xs rounded-md transition-colors hover:bg-fill-tertiary"
                  aria-label="Opciones de planificación"
                >
                  <MoreHorizontal size={20} style={{ color: "var(--fg-secondary)" }} />
                </button>
              </div>
              <Link
                href={
                  group.assigned_planning_id
                    ? `/plannings/${group.assigned_planning_id}`
                    : "#"
                }
                className="no-underline block"
              >
                <div
                  className="rounded-lg p-xl flex items-center gap-lg transition-opacity hover:opacity-90"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--separator-subtle)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-pill flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--primary-alpha-12)" }}
                  >
                    <BookOpen size={20} style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold text-fg truncate">
                      {group.assigned_planning_title}
                    </span>
                    {group.assigned_at && (
                      <span className="text-xs text-fg-tertiary">
                        {formatAssignedAt(group.assigned_at)}
                      </span>
                    )}
                  </div>
                  <Badge variant="success">Activa</Badge>
                  <ChevronRight size={16} style={{ color: "var(--fg-quaternary)" }} />
                </div>
              </Link>
            </div>
          )}

          {/* Miembros */}
          <GroupMembersPanel
            groupId={groupId}
            members={group.members}
            onAddMembersClick={() => setAddMembersOpen(true)}
            onMemberRemoved={loadGroup}
          />

          {/* Leaderboard */}
          <GroupLeaderboard groupId={groupId} />
        </>
      ) : null}

      {/* ─── Modals ─── */}

      <AddMembersModal
        open={addMembersOpen}
        onClose={() => setAddMembersOpen(false)}
        groupId={groupId}
        currentMemberIds={group?.members.map((m) => m.id) ?? []}
        onAdded={loadGroup}
      />

      <AssignPlanningModal
        open={assignPlanningOpen}
        onClose={() => setAssignPlanningOpen(false)}
        groupId={groupId}
        onAssigned={(results) => {
          setAssignResults(results);
          setAssignResultsOpen(true);
          loadGroup();
        }}
      />

      {/* Editar grupo */}
      <Modal
        open={editGroupOpen}
        onClose={() => setEditGroupOpen(false)}
        title="Editar grupo"
        size="sm"
      >
        {group && (
          <GroupForm
            defaultValues={{ name: group.name, description: group.description ?? "" }}
            onSubmit={handleEditSubmit}
            submitLabel="Guardar cambios"
            error={editError}
          />
        )}
      </Modal>

      {/* Confirmar eliminar */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Eliminar grupo"
        description={`¿Estás seguro que querés eliminar "${group?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDeleteGroup}
        onClose={() => {
          if (!deleting) setDeleteConfirmOpen(false);
        }}
      />

      {/* Confirmar desactivar planning */}
      <ConfirmDialog
        open={unassignConfirmOpen}
        title="Desactivar planificación"
        description={`¿Querés desvincular "${group?.assigned_planning_title}" de este grupo?`}
        confirmLabel="Desactivar"
        confirmVariant="danger"
        loading={unassigning}
        onConfirm={handleUnassignPlanning}
        onClose={() => {
          if (!unassigning) setUnassignConfirmOpen(false);
        }}
      />

      {/* Acciones de planning activa */}
      <Modal
        open={planningActionsOpen}
        onClose={() => setPlanningActionsOpen(false)}
        title="Planificación activa"
        size="sm"
      >
        <div className="flex flex-col gap-sm">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              setPlanningActionsOpen(false);
              setAssignPlanningOpen(true);
            }}
          >
            Cambiar planificación
          </Button>
          <Button
            variant="danger"
            size="lg"
            className="w-full"
            onClick={() => {
              setPlanningActionsOpen(false);
              setUnassignConfirmOpen(true);
            }}
          >
            Desactivar planificación
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => setPlanningActionsOpen(false)}
          >
            Cancelar
          </Button>
        </div>
      </Modal>

      {/* Resultado de asignación */}
      <Modal
        open={assignResultsOpen}
        onClose={() => setAssignResultsOpen(false)}
        title="Asignación completada"
        size="sm"
      >
        {assignResults && (
          <div className="flex flex-col gap-lg">
            <p className="text-sm text-fg-secondary m-0">
              {assignResults.every((r) => r.success)
                ? "Planificación asignada correctamente a todos los miembros."
                : `Asignada a ${assignResults.filter((r) => r.success).length} de ${assignResults.length} miembros.`}
            </p>

            {assignResults.some((r) => !r.success) && (
              <div className="flex flex-col gap-xs">
                <p className="text-xs font-semibold text-fg-secondary m-0">
                  Miembros con error:
                </p>
                {assignResults
                  .filter((r) => !r.success)
                  .map((r) => {
                    const member = group?.members.find((m) => m.id === r.student_id);
                    return (
                      <p key={r.student_id} className="text-xs text-destructive m-0">
                        {member?.username ?? `Alumno ${r.student_id}`}: {r.error ?? "Error desconocido"}
                      </p>
                    );
                  })}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => setAssignResultsOpen(false)}
            >
              Entendido
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
