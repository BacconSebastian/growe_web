"use client";

import React, { useMemo, useState } from "react";
import { Plus, UserMinus, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { removeGroupMember } from "@/lib/api/coaching";
import type { TrainingGroupMember } from "@/lib/api/types";
import { getErrorMessage, getDisplayName, getUserInitials } from "@/lib/utils";
import { useAliases } from "@/contexts/AliasContext";
import { StudentBadges } from "@/components/coaching/StudentBadges";

const SEARCH_THRESHOLD = 8;
const PER_PAGE = 5;

interface GroupMembersPanelProps {
  groupId: number;
  members: TrainingGroupMember[];
  onAddMembersClick: () => void;
  onMemberRemoved: () => void;
}

function formatJoinedAt(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `Desde ${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "";
  }
}

/**
 * GroupMembersPanel — lista paginada de miembros con búsqueda y acción de quitar.
 */
export const GroupMembersPanel: React.FC<GroupMembersPanelProps> = ({
  groupId,
  members,
  onAddMembersClick,
  onMemberRemoved,
}) => {
  const { aliases } = useAliases();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [removeTarget, setRemoveTarget] = useState<TrainingGroupMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter(
      (m) =>
        getDisplayName({ ...m, id: m.id }, aliases).toLowerCase().includes(term) ||
        m.username.toLowerCase().includes(term)
    );
  }, [members, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedMembers = filteredMembers.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await removeGroupMember(groupId, removeTarget.id);
      setRemoveTarget(null);
      onMemberRemoved();
    } catch (err) {
      setRemoveError(getErrorMessage(err, "No se pudo quitar al miembro"));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      {/* Header de sección */}
      <div className="flex items-center justify-between gap-md mb-lg">
        <h2 className="text-lg font-semibold text-fg m-0">Miembros</h2>
        <Button
          variant="outline"
          size="sm"
          iconLeft={<Plus size={14} />}
          onClick={onAddMembersClick}
        >
          Agregar
        </Button>
      </div>

      {removeError && <ErrorBanner message={removeError} className="mb-md" />}

      {members.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="Sin miembros"
          description="Este grupo no tiene miembros aún."
          action={
            <Button variant="primary" iconLeft={<Plus size={16} />} onClick={onAddMembersClick}>
              Agregar miembros
            </Button>
          }
        />
      ) : (
        <>
          {members.length > SEARCH_THRESHOLD && (
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Buscar por nombre..."
              className="mb-md"
            />
          )}

          {search.trim() !== "" && filteredMembers.length === 0 ? (
            <p className="text-sm text-fg-secondary text-center py-xl">
              No encontramos resultados para esa búsqueda.
            </p>
          ) : (
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: "var(--card)",
                border: "1px solid var(--separator-subtle)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {pagedMembers.map((member, idx) => {
                const initials = getUserInitials(member);
                const displayName = getDisplayName({ ...member, id: member.id }, aliases);
                const isLast = idx === pagedMembers.length - 1;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-md px-xl py-md"
                    style={{
                      borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)",
                    }}
                  >
                    <Avatar src={member.avatar_url} initials={initials} size="md" />

                    {/* Columna principal: nombre + fecha + badges */}
                    <div className="flex flex-col flex-1 min-w-0 gap-xxs">
                      <Link
                        href={`/students/${member.id}`}
                        className="no-underline group"
                      >
                        <span className="text-sm font-medium text-fg group-hover:underline truncate block">
                          {displayName}
                        </span>
                        <span className="text-xs text-fg-tertiary">
                          {formatJoinedAt(member.joined_at)}
                        </span>
                      </Link>
                      <StudentBadges
                        lastWorkoutAt={member.last_workout_at}
                        activePlanningTitle={member.active_planning_title ?? null}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setRemoveTarget(member)}
                      className="w-8 h-8 rounded-pill flex items-center justify-center flex-shrink-0 transition-colors hover:opacity-80"
                      style={{ background: "var(--destructive-alpha-08)" }}
                      aria-label={`Quitar a ${displayName}`}
                    >
                      <UserMinus size={14} style={{ color: "var(--destructive)" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-md mt-md">
              <span className="text-xs text-fg-tertiary">
                Pág {safePage} de {totalPages}
              </span>
              <div className="flex items-center gap-sm">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog de confirmación para quitar miembro */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Quitar miembro"
        description={
          removeTarget
            ? `¿Querés quitar a ${getDisplayName({ ...removeTarget, id: removeTarget.id }, aliases)} del grupo?`
            : ""
        }
        confirmLabel="Quitar"
        confirmVariant="danger"
        loading={removing}
        onConfirm={handleConfirmRemove}
        onClose={() => {
          if (!removing) setRemoveTarget(null);
        }}
      />
    </>
  );
};
