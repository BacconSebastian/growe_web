import React from "react";
import { Input } from "./Input";

interface FieldProps {
  label: string;
  error?: string;
  /** Props adicionales pasados al Input */
  inputProps: React.InputHTMLAttributes<HTMLInputElement> & {
    icon?: React.ReactNode;
    iconRight?: React.ReactNode;
  };
}

/**
 * Wrapper de campo de formulario: label visible + Input + mensaje de error.
 * Integrado con react-hook-form via inputProps (register spread).
 */
export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  function Field({ label, error, inputProps }, ref) {
    const { icon, iconRight, ...restInput } = inputProps;
    return (
      <div ref={ref} className="flex flex-col gap-xs">
        <label className="text-sm font-medium text-fg-secondary">
          {label}
        </label>
        <Input icon={icon} iconRight={iconRight} error={Boolean(error)} {...restInput} />
        {error && (
          <p className="text-xxs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
