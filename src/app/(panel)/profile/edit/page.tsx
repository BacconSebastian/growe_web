"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { getProfile, updateProfile } from "@/lib/api/profile";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/lib/api/types";
import { useState } from "react";

// ─── Schema ──────────────────────────────────────────────────────────────────

// Username: 3-30 chars, minúsculas, números, punto o guion bajo
const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;

const editProfileSchema = z.object({
  first_name: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  last_name: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  username: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(
      USERNAME_REGEX,
      "Solo letras minúsculas, números, punto o guion bajo (3-30 caracteres)"
    ),
  gender: z
    .enum(["male", "female", "other", ""])
    .optional(),
});

type EditProfileValues = z.infer<typeof editProfileSchema>;

// Tipo extendido con campos extra del backend
interface FullProfile extends User {
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  birth_date?: string | null;
}

// ─── Componente ─────────────────────────────────────────────────────────────

/**
 * /profile/edit — Editar perfil del coach.
 * Campos: first_name, last_name, username, gender.
 * Errores del backend (ej: username tomado) se muestran inline.
 */
export default function EditProfilePage() {
  const router = useRouter();
  const { setUser: setAuthUser } = useAuth();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      gender: "",
    },
  });

  useEffect(() => {
    getProfile()
      .then((p) => {
        const prof = p as FullProfile;
        reset({
          first_name: prof.first_name ?? "",
          last_name: prof.last_name ?? "",
          username: prof.username ?? "",
          gender: (prof.gender as "" | "male" | "female" | "other") ?? "",
        });
      })
      .catch((err) => setSubmitError(getErrorMessage(err, "No se pudo cargar el perfil.")))
      .finally(() => setLoadingProfile(false));
  }, [reset]);

  const onSubmit = async (data: EditProfileValues) => {
    setSubmitError(null);
    try {
      const payload: Partial<User> = {
        username: data.username,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        gender: data.gender ? (data.gender as User["gender"]) : null,
      };
      const updated = await updateProfile(payload);
      // Refrescar el user en AuthContext para que topbar/sidebar se actualicen
      setAuthUser(updated);
      router.push("/profile");
    } catch (err) {
      setSubmitError(getErrorMessage(err, "No se pudo actualizar el perfil. Intentá de nuevo."));
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex flex-col gap-xl max-w-lg">
        <SkeletonLine width="40%" height={18} />
        {[1, 2, 3, 4].map((i) => (
          <SkeletonLine key={i} width="100%" height={44} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xxl max-w-lg">
      {/* Header */}
      <div>
        <h1
          className="text-display font-bold tracking-tight"
          style={{ margin: 0, letterSpacing: "-0.4px" }}
        >
          Editar perfil
        </h1>
        <p className="text-base text-fg-secondary mt-xs m-0">
          Actualizá tu información personal
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-xl">
        {submitError && (
          <ErrorBanner message={submitError} dismissible />
        )}

        <Field
          label="Nombre"
          error={errors.first_name?.message}
          inputProps={{
            ...register("first_name"),
            placeholder: "Tu nombre",
            maxLength: 100,
            autoComplete: "given-name",
          }}
        />

        <Field
          label="Apellido"
          error={errors.last_name?.message}
          inputProps={{
            ...register("last_name"),
            placeholder: "Tu apellido",
            maxLength: 100,
            autoComplete: "family-name",
          }}
        />

        <Field
          label="Username *"
          error={errors.username?.message}
          inputProps={{
            ...register("username"),
            placeholder: "tu_username",
            maxLength: 30,
            autoComplete: "username",
          }}
        />

        {/* Género */}
        <div className="flex flex-col gap-xs">
          <label className="text-sm font-medium text-fg-secondary">
            Género (opcional)
          </label>
          <select
            {...register("gender")}
            className={[
              "w-full h-11 bg-fill-tertiary text-fg",
              "border border-transparent rounded-md px-md",
              "text-base outline-none",
              "transition-colors duration-150",
              "focus:border-primary focus:bg-fill-quaternary",
              errors.gender ? "border-destructive" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <option value="">Prefiero no decir</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="other">Otro</option>
          </select>
          {errors.gender && (
            <p className="text-xxs text-destructive">{errors.gender.message}</p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-sm pt-sm"
          style={{ borderTop: "1px solid var(--separator-subtle)" }}
        >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            className="flex-1"
          >
            Guardar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={isSubmitting}
            onClick={() => router.push("/profile")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
