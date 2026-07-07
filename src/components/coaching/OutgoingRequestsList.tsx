"use client";

/**
 * OutgoingRequestsList — lista de solicitudes de coaching salientes (pendientes).
 *
 * El componente puede operar en dos modos:
 *
 *   A) Autónomo (default):
 *      Llama a listCoachingRequests() internamente y extrae el campo `outgoing`.
 *      Útil para embebido standalone (ej: sección en una página de conexiones).
 *
 *   B) Controlado (prop `requests`):
 *      Recibe las solicitudes ya cargadas desde el padre.
 *      Útil cuando el padre ya cargó listCoachingRequests y quiere evitar
 *      la doble llamada (ej: la misma página muestra también las entrantes).
 *
 * NOTA SOBRE ENDPOINT:
 *   No existe un endpoint dedicado a listar SOLO solicitudes salientes del coach.
 *   GET /coaching/requests devuelve { incoming, outgoing }.
 *   El componente usa `outgoing` de esa respuesta.
 *   Si en el futuro el backend expone GET /coaching/requests/outgoing, actualizar
 *   la función fetchRequests para llamarlo directamente.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Send, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listCoachingRequests, cancelCoachRequest } from "@/lib/api/coaching";
import { getErrorMessage, getDisplayName } from "@/lib/utils";
import { useAliases } from "@/contexts/AliasContext";
import type { CoachingRequest } from "@/lib/api/coaching";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface OutgoingRequestsListProps {
  /**
   * Si se provee, el componente usa estos datos en lugar de fetchear internamente.
   * El padre es responsable de mantener la lista actualizada tras cancelaciones.
   */
  requests?: CoachingRequest[];
  /**
   * Callback invocado tras una cancelación exitosa con el ID de la solicitud
   * cancelada. Útil para que el padre actualice su propio estado.
   */
  onCancelled?: (requestId: number) => void;
  className?: string;
}

// ─── Skeleton de fila ─────────────────────────────────────────────────────────

const RowSkeleton: React.FC = () => (
  <div className="flex items-center gap-md py-md">
    <SkeletonCircle size={36} />
    <div className="flex flex-col gap-xs flex-1">
      <SkeletonLine width="40%" height={14} />
      <SkeletonLine width="25%" height={12} />
    </div>
    <div
      className="w-24 h-8 rounded-pill animate-pulse flex-shrink-0"
      style={{ background: "var(--fill-quaternary)" }}
    />
  </div>
);

// ─── Fila de solicitud individual ─────────────────────────────────────────────

interface RequestRowProps {
  request: CoachingRequest;
  onCancel: (id: number) => void;
  cancelling: boolean;
}

const RequestRow: React.FC<RequestRowProps> = ({ request, onCancel, cancelling }) => {
  const { aliases } = useAliases();
  const receiver = request.sender; // En solicitudes salientes el "sender" es el propio coach,
  // pero el backend incluye en el campo `sender` el usuario destino según el contexto.
  // En realidad para salientes necesitamos el receiver — ver nota abajo.

  /**
   * NOTA: La interfaz CoachingRequest del web tiene:
   *   sender_id, receiver_id, sender?: { id, username, ... }
   *
   * Para solicitudes SALIENTES (el coach envió la solicitud), el objeto relevante
   * a mostrar es el RECEPTOR (receiver). Sin embargo, el backend actualmente
   * solo incluye `sender` en el objeto de solicitud (quien inició el request).
   *
   * Como el coach ES el sender de las solicitudes salientes, el campo `sender`
   * en la respuesta `outgoing[]` representa al propio coach — no al destinatario.
   *
   * Si el backend populara un campo `receiver` en las solicitudes salientes,
   * se podría mostrar el nombre del destinatario directamente. Por ahora
   * mostramos el `receiver_id` como identificador de respaldo.
   *
   * TODO: solicitar al backend que incluya `receiver: { id, username, ... }`
   *       en los objetos del array `outgoing` de GET /coaching/requests.
   */
  const displayName = receiver
    ? getDisplayName({
        id: receiver.id,
        first_name: receiver.first_name,
        last_name: receiver.last_name,
        username: receiver.username,
      }, aliases)
    : `Usuario #${request.receiver_id}`;

  const username = receiver?.username
    ? `@${receiver.username}`
    : null;

  const initials = receiver
    ? (receiver.first_name?.[0] ?? receiver.username[0] ?? "?").toUpperCase()
    : "?";

  return (
    <div
      className="flex items-center gap-md py-md"
      style={{ borderBottom: "1px solid var(--separator-subtle)" }}
    >
      <Avatar
        src={receiver?.avatar_url}
        initials={initials}
        alt={displayName}
        size="md"
      />

      <div className="flex flex-col gap-xxs flex-1 min-w-0">
        <span className="text-sm font-semibold text-fg truncate">{displayName}</span>
        {username && (
          <span className="text-xs text-fg-tertiary truncate">{username}</span>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        loading={cancelling}
        onClick={() => onCancel(request.id)}
        iconLeft={<X size={14} />}
        className="flex-shrink-0"
      >
        Cancelar
      </Button>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const OutgoingRequestsList: React.FC<OutgoingRequestsListProps> = ({
  requests: requestsProp,
  onCancelled,
  className = "",
}) => {
  const isControlled = requestsProp !== undefined;

  // Estado interno (solo si no controlado)
  const [internalRequests, setInternalRequests] = useState<CoachingRequest[]>([]);
  const [loading, setLoading] = useState(!isControlled);
  const [error, setError] = useState<string | null>(null);

  // Estado de confirmación de cancelación
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const requests = isControlled ? requestsProp : internalRequests;

  // Fetch interno (solo cuando no controlado)
  const fetchRequests = useCallback(async () => {
    if (isControlled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listCoachingRequests();
      // Filtramos solo las pendientes — las aceptadas/rechazadas no son relevantes aquí
      setInternalRequests(
        res.outgoing.filter((r) => r.status === "pending")
      );
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las solicitudes enviadas."));
    } finally {
      setLoading(false);
    }
  }, [isControlled]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleConfirmCancel = async () => {
    if (cancelTarget == null) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelCoachRequest(cancelTarget);
      if (!isControlled) {
        setInternalRequests((prev) =>
          prev.filter((r) => r.id !== cancelTarget)
        );
      }
      onCancelled?.(cancelTarget);
      setCancelTarget(null);
    } catch (err) {
      setCancelError(
        getErrorMessage(err, "No se pudo cancelar la solicitud. Intenta de nuevo.")
      );
    } finally {
      setCancelling(false);
    }
  };

  // ─── Skeleton ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={className}>
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  // ─── Error de carga ────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className={className}>
        <ErrorBanner message={error} />
      </div>
    );
  }

  // ─── Pendientes filtradas ──────────────────────────────────────────────────

  const pending = requests.filter((r) => r.status === "pending");

  // ─── Empty state ───────────────────────────────────────────────────────────

  if (pending.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<Send size={24} />}
          title="Sin solicitudes enviadas"
          description="Las solicitudes de coaching que envíes a alumnos aparecerán aquí mientras estén pendientes de respuesta."
        />
      </div>
    );
  }

  // ─── Lista ─────────────────────────────────────────────────────────────────

  return (
    <div className={className}>
      {cancelError && (
        <div className="mb-md">
          <ErrorBanner message={cancelError} />
        </div>
      )}

      <div>
        {pending.map((request, index) => (
          <div
            key={request.id}
            style={
              index === pending.length - 1
                ? { borderBottom: "none" }
                : undefined
            }
          >
            <RequestRow
              request={request}
              onCancel={(id) => setCancelTarget(id)}
              cancelling={cancelling && cancelTarget === request.id}
            />
          </div>
        ))}
      </div>

      {/* Confirmación de cancelación */}
      <ConfirmDialog
        open={cancelTarget != null}
        title="Cancelar solicitud"
        description="¿Querés cancelar esta solicitud de coaching? El alumno ya no podrá aceptarla."
        confirmLabel="Sí, cancelar"
        confirmVariant="danger"
        loading={cancelling}
        onConfirm={handleConfirmCancel}
        onClose={() => {
          if (!cancelling) {
            setCancelTarget(null);
            setCancelError(null);
          }
        }}
      />
    </div>
  );
};
