"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  searchUsers,
  sendCoachRequest,
  type UserSearchResult,
} from "@/lib/api/coaching";
import { getErrorMessage, getDisplayName, getUserInitials } from "@/lib/utils";
import { useAliases } from "@/contexts/AliasContext";

interface InviteStudentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * InviteStudentModal — invita a un alumno buscándolo por nombre/usuario/email.
 *
 * El backend exige `receiver_id` en POST /coaching/requests (no acepta
 * `identifier`), por eso el flujo es: buscar (GET /community/users/search) →
 * elegir un usuario → enviar la solicitud con su ID (sendCoachRequest).
 */
export const InviteStudentModal: React.FC<InviteStudentModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { aliases } = useAliases();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = () => {
    setQuery("");
    setResults([]);
    setSearching(false);
    setSendingId(null);
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Búsqueda con debounce (≥2 chars exigidos por el backend).
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchUsers(q, { role: "alumno", limit: 15 });
        setResults(found);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err, "No se pudo buscar usuarios"));
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleInvite = async (target: UserSearchResult) => {
    setSendingId(target.id);
    setError(null);
    try {
      await sendCoachRequest(target.id);
      setSuccess(
        getDisplayName({
          id: target.id,
          first_name: target.first_name,
          last_name: target.last_name,
          username: target.username,
        }, aliases)
      );
      onSuccess?.();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo enviar la invitación"));
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Invitar alumno" size="sm">
      {success ? (
        <div className="flex flex-col items-center gap-lg py-md text-center">
          <div
            className="w-12 h-12 rounded-pill flex items-center justify-center"
            style={{ background: "var(--success-alpha-12)" }}
          >
            <UserPlus size={20} style={{ color: "var(--success)" }} />
          </div>
          <div className="flex flex-col gap-sm">
            <p className="text-lg font-semibold text-fg m-0">Invitación enviada</p>
            <p className="text-base text-fg-secondary m-0">
              {success} recibirá tu solicitud de coaching.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleClose}
            className="w-full"
          >
            Listo
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-lg">
          {error && <ErrorBanner message={error} dismissible />}

          {/* Buscador */}
          <div className="flex flex-col gap-xs">
            <label className="text-sm font-medium text-fg-secondary">
              Buscar alumno
            </label>
            <div className="relative">
              <span className="absolute left-md top-1/2 -translate-y-1/2 text-fg-tertiary pointer-events-none">
                <Search size={16} />
              </span>
              <input
                type="text"
                autoFocus
                autoComplete="off"
                placeholder="Nombre, usuario o email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={[
                  "w-full h-11 bg-fill-tertiary text-fg placeholder-fg-tertiary",
                  "border border-transparent rounded-md text-base outline-none transition-colors duration-150",
                  "focus:border-primary focus:bg-fill-quaternary pl-10 pr-md",
                ].join(" ")}
              />
            </div>
          </div>

          {/* Resultados */}
          <div className="flex flex-col gap-xs min-h-[120px]">
            {searching ? (
              <div className="flex items-center justify-center gap-sm py-xl text-fg-tertiary">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Buscando…</span>
              </div>
            ) : query.trim().length < 2 ? (
              <p className="text-sm text-fg-tertiary text-center py-xl m-0">
                Escribí al menos 2 caracteres para buscar.
              </p>
            ) : results.length === 0 ? (
              <p className="text-sm text-fg-tertiary text-center py-xl m-0">
                No se encontraron usuarios con ese criterio.
              </p>
            ) : (
              results.map((u) => {
                const name = getDisplayName({
                  id: u.id,
                  first_name: u.first_name,
                  last_name: u.last_name,
                  username: u.username,
                }, aliases);
                const initials = getUserInitials({
                  first_name: u.first_name,
                  last_name: u.last_name,
                  username: u.username,
                });
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-md p-md rounded-md"
                    style={{ background: "var(--fill-tertiary)" }}
                  >
                    <Avatar src={u.avatar_url} initials={initials} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg m-0 truncate">
                        {name}
                      </p>
                      <p className="text-xs text-fg-tertiary m-0 truncate">
                        @{u.username}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={sendingId === u.id}
                      disabled={sendingId !== null}
                      onClick={() => handleInvite(u)}
                    >
                      Invitar
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClose}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
