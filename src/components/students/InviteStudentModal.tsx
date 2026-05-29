"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { inviteStudent } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";

const schema = z.object({
  identifier: z
    .string()
    .min(1, "Ingresá el email o usuario del alumno")
    .max(200, "El valor es demasiado largo"),
});

type FormValues = z.infer<typeof schema>;

interface InviteStudentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * InviteStudentModal — modal para invitar a un alumno por email o username.
 */
export const InviteStudentModal: React.FC<InviteStudentModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "" },
  });

  const handleClose = () => {
    reset();
    setError(null);
    setSuccess(false);
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await inviteStudent({ identifier: values.identifier });
      setSuccess(true);
      reset();
      onSuccess?.();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo enviar la invitación"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Invitar alumno"
      size="sm"
    >
      {success ? (
        <div className="flex flex-col items-center gap-lg py-md text-center">
          <div
            className="w-12 h-12 rounded-pill flex items-center justify-center"
            style={{ background: "var(--success-alpha-12)" }}
          >
            <UserPlus size={20} style={{ color: "var(--success)" }} />
          </div>
          <div className="flex flex-col gap-sm">
            <p className="text-lg font-semibold text-fg m-0">
              Invitación enviada
            </p>
            <p className="text-base text-fg-secondary m-0">
              El alumno recibirá tu solicitud de coaching.
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={handleClose} className="w-full">
            Listo
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-xl">
          {error && <ErrorBanner message={error} />}

          <div className="flex flex-col gap-xs">
            <label className="text-sm font-medium text-fg-secondary">
              Email o usuario
            </label>
            <input
              type="text"
              autoFocus
              autoComplete="off"
              placeholder="usuario@ejemplo.com"
              className={[
                "w-full h-11 bg-fill-tertiary text-fg placeholder-fg-tertiary",
                "border rounded-md text-base outline-none transition-colors duration-150",
                "focus:border-primary focus:bg-fill-quaternary px-md",
                errors.identifier ? "border-destructive" : "border-transparent",
              ].join(" ")}
              {...register("identifier")}
            />
            {errors.identifier && (
              <p className="text-xxs text-destructive">{errors.identifier.message}</p>
            )}
          </div>

          <p className="text-sm text-fg-secondary m-0">
            Ingresá el email o el nombre de usuario del alumno que querés agregar a tu plantel.
          </p>

          <div className="flex flex-col gap-sm">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full"
            >
              Enviar invitación
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={isSubmitting}
              onClick={handleClose}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
