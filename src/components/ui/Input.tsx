import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Ícono posicionado a la izquierda del input */
  icon?: React.ReactNode;
  /** Ícono posicionado a la derecha del input (ej: toggle de contraseña) */
  iconRight?: React.ReactNode;
  /** Muestra un estado de error con borde rojo */
  error?: boolean;
}

/**
 * Input base: altura 44px, bg fill-tertiary, radius-md, focus ring primary.
 * Soporta slot de ícono izquierdo y derecho.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ icon, iconRight, error = false, className = "", ...rest }, ref) {
    const hasIcon = Boolean(icon);
    const hasIconRight = Boolean(iconRight);

    return (
      <div className="relative">
        {icon && (
          <span className="absolute left-md top-1/2 -translate-y-1/2 text-fg-tertiary flex items-center pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={[
            "w-full h-11 bg-fill-tertiary text-fg placeholder-fg-tertiary",
            "border border-transparent rounded-md",
            "text-base outline-none",
            "transition-colors duration-150",
            "focus:border-primary focus:bg-fill-quaternary",
            error && "border-destructive focus:border-destructive",
            hasIcon ? "pl-10 pr-md" : "px-md",
            hasIconRight ? "pr-10" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />
        {iconRight && (
          <span className="absolute right-md top-1/2 -translate-y-1/2 text-fg-tertiary flex items-center">
            {iconRight}
          </span>
        )}
      </div>
    );
  }
);
