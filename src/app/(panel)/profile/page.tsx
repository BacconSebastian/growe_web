"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Calendar,
  Mail,
  AtSign,
  User as UserIcon,
  Globe,
  MapPin,
  Users,
  Star,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine, SkeletonCircle, SkeletonBox } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { AvatarUploadModal } from "@/components/profile/AvatarUploadModal";
import { getProfile, deleteAvatar, logout as apiLogout, deleteAccount } from "@/lib/api/profile";
import { getErrorMessage, getUserInitials, getDisplayName } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/lib/api/types";

// Tipo extendido con campos del backend que pueden no estar en el User base
interface FullProfile extends User {
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  birth_date?: string | null;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
}

// ─── Modal de eliminar cuenta ────────────────────────────────────────────────

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteAccountModal({ open, onClose, onDeleted }: DeleteAccountModalProps) {
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirmed(false);
    setError(null);
    setDeleting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDelete = async () => {
    if (!password) {
      setError("Ingresá tu contraseña para confirmar.");
      return;
    }
    if (!confirmed) {
      setError("Debés marcar el checkbox para confirmar.");
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount({ password });
      onDeleted();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar la cuenta. Verificá tu contraseña."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Eliminar cuenta"
      size="sm"
      dismissable={!deleting}
    >
      <div className="flex flex-col gap-lg">
        <div
          className="flex items-start gap-sm p-lg rounded-md"
          style={{
            background: "var(--destructive-alpha-12)",
            border: "1px solid var(--destructive-alpha-20)",
          }}
        >
          <AlertCircle size={16} style={{ color: "var(--destructive)", flexShrink: 0 }} />
          <p className="text-sm m-0" style={{ color: "var(--destructive)" }}>
            Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos tus
            datos, rutinas y planificaciones.
          </p>
        </div>

        <div className="flex flex-col gap-xs">
          <label className="text-sm font-medium text-fg-secondary">
            Contraseña actual *
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            autoComplete="current-password"
          />
        </div>

        <label className="flex items-start gap-sm cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 flex-shrink-0"
          />
          <span className="text-sm text-fg-secondary">
            Entiendo que esta acción es irreversible y perderé todos mis datos.
          </span>
        </label>

        {error && (
          <p className="text-sm text-destructive m-0">{error}</p>
        )}

        <div className="flex flex-col gap-sm">
          <Button
            variant="danger"
            size="lg"
            loading={deleting}
            disabled={!password || !confirmed}
            onClick={handleDelete}
            className="w-full"
          >
            Eliminar mi cuenta
          </Button>
          <Button
            variant="secondary"
            size="lg"
            disabled={deleting}
            onClick={handleClose}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

/**
 * /profile — Ver perfil del coach.
 * Muestra avatar, información de cuenta, sección seguridad y zona de peligro.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, setUser: setAuthUser, logout: authLogout } = useAuth();

  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [showDeleteAvatar, setShowDeleteAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [deleteAvatarError, setDeleteAvatarError] = useState<string | null>(null);

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProfile()
      .then((p) => setProfile(p as FullProfile))
      .catch((err) => setError(getErrorMessage(err, "No se pudo cargar el perfil.")))
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarUploaded = (avatarUrl: string) => {
    // Actualizar el profile local
    if (profile) setProfile({ ...profile, avatar_url: avatarUrl });
    // Actualizar el user en AuthContext para que topbar/sidebar reflejen el cambio
    if (authUser) setAuthUser({ ...authUser, avatar_url: avatarUrl });
  };

  const handleDeleteAvatar = async () => {
    setDeletingAvatar(true);
    setDeleteAvatarError(null);
    try {
      await deleteAvatar();
      if (profile) setProfile({ ...profile, avatar_url: null });
      if (authUser) setAuthUser({ ...authUser, avatar_url: null });
      setShowDeleteAvatar(false);
    } catch (err) {
      setDeleteAvatarError(getErrorMessage(err, "No se pudo eliminar el avatar."));
    } finally {
      setDeletingAvatar(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignorar errores — igual limpiamos localmente
    }
    authLogout();
  };

  const handleAccountDeleted = () => {
    authLogout();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-xxl max-w-2xl">
        <Card className="flex flex-col gap-xl">
          <div className="flex items-center gap-lg">
            <SkeletonCircle size={96} />
            <div className="flex flex-col gap-sm flex-1">
              <SkeletonLine width="50%" height={24} />
              <SkeletonLine width="30%" height={16} />
            </div>
          </div>
          <div className="flex gap-sm">
            <SkeletonBox width={140} height={40} />
            <SkeletonBox width={140} height={40} />
          </div>
        </Card>
        <SkeletonBox height={200} />
        <SkeletonBox height={100} />
      </div>
    );
  }

  if (error) return <ErrorBanner message={error} />;
  if (!profile) return null;

  const initials = getUserInitials(profile);
  const displayName = getDisplayName(profile);

  return (
    <div className="flex flex-col gap-xxl max-w-2xl">
      {/* ─── Header ─── */}
      <div>
        <h1
          className="text-display font-bold tracking-tight"
          style={{ margin: 0, letterSpacing: "-0.4px" }}
        >
          Mi perfil
        </h1>
        <p className="text-base text-fg-secondary mt-xs m-0">
          Tu información de cuenta y configuración
        </p>
      </div>

      {/* ─── Card principal ─── */}
      <Card>
        {/* Avatar + nombre */}
        <div className="flex items-start gap-xl">
          <div className="relative flex-shrink-0">
            <Avatar
              src={profile.avatar_url}
              initials={initials}
              alt={displayName}
              size="xl"
            />
          </div>

          <div className="flex flex-col gap-xs flex-1 min-w-0">
            <div className="flex items-center gap-sm flex-wrap">
              <h2 className="text-xl font-bold text-fg m-0">{displayName}</h2>
              <Badge variant="primary">Coach</Badge>
              {profile.is_premium && (
                <Badge variant="warning">
                  <Star size={10} className="mr-1" />
                  Premium
                </Badge>
              )}
            </div>
            <p className="text-base text-fg-secondary m-0">@{profile.username}</p>
            {(profile as FullProfile).bio && (
              <p className="text-sm text-fg-secondary m-0 mt-xs">{(profile as FullProfile).bio}</p>
            )}
          </div>
        </div>

        {/* Acciones de avatar y perfil */}
        <div className="flex flex-wrap gap-sm mt-xl">
          <Link href="/profile/edit">
            <Button variant="primary" size="sm">
              Editar perfil
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAvatarUpload(true)}
          >
            Cambiar avatar
          </Button>
          {profile.avatar_url && (
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Trash2 size={14} />}
              onClick={() => setShowDeleteAvatar(true)}
            >
              Quitar avatar
            </Button>
          )}
        </div>
        {deleteAvatarError && (
          <p className="text-sm text-destructive mt-sm m-0">{deleteAvatarError}</p>
        )}
      </Card>

      {/* ─── Información de la cuenta ─── */}
      <Card>
        <h3 className="text-lg font-semibold text-fg m-0 mb-lg">Información de la cuenta</h3>
        <div className="flex flex-col gap-md">
          <InfoRow icon={<Mail size={16} />} label="Email">
            <span className="text-fg">{profile.email}</span>
            {profile.email_verified ? (
              <Badge variant="success" size="sm">
                <CheckCircle2 size={10} className="mr-1" />
                Verificado
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">No verificado</Badge>
            )}
          </InfoRow>

          <InfoRow icon={<AtSign size={16} />} label="Username">
            @{profile.username}
          </InfoRow>

          {(profile as FullProfile).bio && (
            <InfoRow icon={<UserIcon size={16} />} label="Bio">
              {(profile as FullProfile).bio}
            </InfoRow>
          )}

          {(profile as FullProfile).country && (
            <InfoRow icon={<Globe size={16} />} label="País">
              {(profile as FullProfile).country}
            </InfoRow>
          )}

          {(profile as FullProfile).city && (
            <InfoRow icon={<MapPin size={16} />} label="Ciudad">
              {(profile as FullProfile).city}
            </InfoRow>
          )}

          <InfoRow icon={<Calendar size={16} />} label="Miembro desde">
            {formatDate(profile.created_at)}
          </InfoRow>

          {profile.updated_at && (
            <InfoRow icon={<Calendar size={16} />} label="Última actualización">
              {formatDate(profile.updated_at)}
            </InfoRow>
          )}

          {typeof profile.max_students === "number" && (
            <InfoRow icon={<Users size={16} />} label="Cap de alumnos">
              {profile.max_students} alumnos máximo
            </InfoRow>
          )}
        </div>
      </Card>

      {/* ─── Seguridad ─── */}
      <Card>
        <h3 className="text-lg font-semibold text-fg m-0 mb-lg">Seguridad</h3>
        <div className="flex items-center justify-between gap-lg">
          <div className="flex items-center gap-sm">
            <Shield size={16} style={{ color: "var(--fg-secondary)" }} />
            <span className="text-base text-fg">Contraseña</span>
          </div>
          <Link href="/profile/password">
            <Button variant="outline" size="sm">
              Cambiar contraseña
            </Button>
          </Link>
        </div>
      </Card>

      {/* ─── Zona de peligro ─── */}
      <Card>
        <h3 className="text-lg font-semibold m-0 mb-lg" style={{ color: "var(--destructive)" }}>
          Zona de peligro
        </h3>
        <div className="flex flex-col gap-md">
          <div className="flex items-center justify-between gap-lg">
            <div className="flex flex-col gap-xxs">
              <span className="text-base font-medium text-fg">Cerrar sesión</span>
              <span className="text-sm text-fg-secondary">
                Cerrá la sesión en este dispositivo.
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>

          <div
            className="flex items-center justify-between gap-lg pt-md"
            style={{ borderTop: "1px solid var(--separator-subtle)" }}
          >
            <div className="flex flex-col gap-xxs">
              <span className="text-base font-medium" style={{ color: "var(--destructive)" }}>
                Eliminar cuenta
              </span>
              <span className="text-sm text-fg-secondary">
                Acción permanente e irreversible. Se eliminarán todos tus datos.
              </span>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteAccount(true)}
            >
              Eliminar cuenta
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── Modales ─── */}
      <AvatarUploadModal
        open={showAvatarUpload}
        onClose={() => setShowAvatarUpload(false)}
        onSuccess={handleAvatarUploaded}
      />

      <ConfirmDialog
        open={showDeleteAvatar}
        title="Quitar avatar"
        description="¿Confirmás que querés eliminar tu foto de perfil?"
        confirmLabel="Quitar avatar"
        confirmVariant="danger"
        loading={deletingAvatar}
        onConfirm={handleDeleteAvatar}
        onClose={() => setShowDeleteAvatar(false)}
      />

      <DeleteAccountModal
        open={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onDeleted={handleAccountDeleted}
      />
    </div>
  );
}

// ─── Helper de fila de info ──────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-md py-sm" style={{ borderBottom: "1px solid var(--separator-subtle)" }}>
      <span className="flex-shrink-0 mt-px" style={{ color: "var(--fg-tertiary)" }}>
        {icon}
      </span>
      <span className="text-sm text-fg-secondary w-32 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-sm flex-wrap text-sm text-fg min-w-0">
        {children}
      </div>
    </div>
  );
}
