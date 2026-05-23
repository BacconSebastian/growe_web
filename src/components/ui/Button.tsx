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

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary border-transparent hover:opacity-90",
  outline: "bg-transparent text-primary border-primary hover:bg-primary-alpha-08",
  ghost: "bg-transparent text-fg border-transparent hover:bg-fill-tertiary",
  secondary: "bg-fill-tertiary text-fg border-transparent hover:bg-fill-secondary",
  danger: "bg-destructive text-on-destructive border-transparent hover:opacity-90",
  success: "bg-success text-on-success border-transparent hover:opacity-90",
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
          "transition-opacity duration-150 active:translate-y-px",
          "whitespace-nowrap select-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
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
