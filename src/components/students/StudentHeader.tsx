"use client";

import React, { useState } from "react";
import { FileText, UserX, StickyNote, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { removeCoaching } from "@/lib/api/coaching";
import { getErrorMessage, getUserInitials, getDisplayName } from "@/lib/utils";
import type { User } from "@/lib/api/types";

interface StudentHeaderProps {
  student: User;
  onShowReport: () => void;
  onOpenNotes?: () => void;
  onOpenSettings?: () => void;
}

/**
 * StudentHeader — avatar grande, nombre, badges y acciones del perfil del alumno.
 */
export const StudentHeader: React.FC<StudentHeaderProps> = ({
  student,
  onShowReport,
  onOpenNotes,
  onOpenSettings,
}) => {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = getDisplayName({
    first_name: student.first_name,
    last_name: student.last_name,
    username: student.username,
  });
  const initials = getUserInitials({
    first_name: student.first_name,
    last_name: student.last_name,
    username: student.username,
  });

  const handleRemoveCoaching = async () => {
    setRemoving(true);
    setError(null);
    try {
      await removeCoaching(student.id);
      router.push("/students");
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo quitar la relación de coaching"));
      setRemoving(false);
    }
    setConfirmOpen(false);
  };

  return (
    <div
      className="flex flex-col gap-xl p-xxl rounded-lg"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {error && <ErrorBanner message={error} dismissible />}

      <div className="flex items-start justify-between gap-lg flex-wrap">
        {/* Avatar + info */}
        <div className="flex items-center gap-xl">
          <Avatar src={student.avatar_url ?? null} initials={initials} size="xl" />
          <div className="flex flex-col gap-sm">
            <h1
              className="text-xxl font-bold text-fg"
              style={{ margin: 0 }}
            >
              {displayName}
            </h1>
            <p className="text-sm text-fg-secondary m-0">@{student.username}</p>
            {student.email && (
              <p className="text-sm text-fg-tertiary m-0">{student.email}</p>
            )}
            <div className="flex items-center gap-sm flex-wrap mt-xs">
              <Badge variant="primary" size="sm">Alumno</Badge>
              {student.is_premium && (
                <Badge variant="purple" size="sm">Premium</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-sm flex-shrink-0">
          {onOpenNotes && (
            <Button
              variant="secondary"
              size="md"
              iconLeft={<StickyNote size={16} />}
              onClick={onOpenNotes}
            >
              Notas
            </Button>
          )}
          <Button
            variant="secondary"
            size="md"
            iconLeft={<FileText size={16} />}
            onClick={onShowReport}
          >
            Reporte mensual
          </Button>
          {onOpenSettings && (
            <Button
              variant="secondary"
              size="md"
              iconLeft={<Settings size={16} />}
              onClick={onOpenSettings}
            >
              Ajustes
            </Button>
          )}
          <Button
            variant="danger"
            size="md"
            iconLeft={<UserX size={16} />}
            onClick={() => setConfirmOpen(true)}
          >
            Quitar coaching
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Quitar coaching"
        description={`¿Estás seguro de que querés quitar a ${displayName} de tu plantel? Esta acción no se puede deshacer.`}
        confirmLabel="Quitar coaching"
        confirmVariant="danger"
        loading={removing}
        onConfirm={handleRemoveCoaching}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
};
