import React from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "secondary" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Ícono a la izquierda del texto */
  iconLeft?: React.ReactNode;
  /** Ícono a la derecha del texto */
  iconRight?: React.ReactNode;
}

// En fondo oscuro las sombras negras no se ven: los botones sólidos usan un
// GLOW del color de la variante (sombra teñida) para dar profundidad real, y
// el secundario usa un borde con brillo (card-border-light) para no quedar
// "gris plano". Todos: leve elevación + brillo al hover.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary border-transparent shadow-[0_2px_12px_var(--primary-alpha-30)] hover:-translate-y-px hover:brightness-110 hover:shadow-[0_5px_18px_var(--primary-alpha-30)] focus-visible:ring-[var(--primary)]",
  outline:
    "bg-transparent text-primary border-primary hover:bg-primary-alpha-08 hover:-translate-y-px focus-visible:ring-[var(--primary)]",
  ghost:
    "bg-transparent text-fg border-transparent hover:bg-fill-tertiary focus-visible:ring-[var(--fg-tertiary)]",
  secondary:
    "bg-fill-tertiary text-fg border-[var(--card-border-light)] hover:bg-fill-secondary hover:-translate-y-px hover:border-[var(--separator)] focus-visible:ring-[var(--fg-tertiary)]",
  danger:
    "bg-destructive text-on-destructive border-transparent shadow-[0_2px_12px_var(--destructive-alpha-20)] hover:-translate-y-px hover:brightness-110 hover:shadow-[0_5px_18px_var(--destructive-alpha-20)] focus-visible:ring-[var(--destructive)]",
  success:
    "bg-success text-on-success border-transparent shadow-[0_2px_12px_var(--success-alpha-30)] hover:-translate-y-px hover:brightness-110 hover:shadow-[0_5px_18px_var(--success-alpha-30)] focus-visible:ring-[var(--success)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-md text-sm font-semibold gap-xs",
  md: "h-11 px-xl text-base font-semibold gap-sm",
  lg: "h-[52px] px-xxl text-lg font-semibold gap-sm",
};

/**
 * Botón pill por defecto (rounded-pill = 9999px).
 * NUNCA usar border-radius custom en botones — siempre pill.
 *
 * Modernizado: transición suave, micro-interacción al presionar (scale),
 * elevación + brillo al hover en variantes sólidas, y anillo de foco accesible
 * (focus-visible) con el color de cada variante. La API se mantiene 1:1 —
 * todos los usos existentes en la web heredan el nuevo look sin cambios.
 *
 * Variants: primary, outline, ghost, secondary, danger, success.
 * Sizes: sm (32px), md (44px), lg (52px).
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      iconLeft,
      iconRight,
      children,
      disabled,
      className = "",
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center rounded-pill border",
          "transition-all duration-150 ease-out will-change-transform",
          "active:scale-[0.97] whitespace-nowrap select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
          "disabled:hover:translate-y-0 disabled:hover:brightness-100 disabled:active:scale-100",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {iconLeft && <span className="inline-flex items-center">{iconLeft}</span>}
            {children}
            {iconRight && <span className="inline-flex items-center">{iconRight}</span>}
          </>
        )}
      </button>
    );
  }
);
