import React from "react";

type CardVariant = "default" | "elevated" | "flat" | "gradient";

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    "bg-card border border-card-border rounded-lg shadow-card",
  elevated:
    "bg-card-elevated border border-card-border-light rounded-lg shadow-elevated",
  flat:
    "bg-card border border-card-border rounded-lg",
  gradient:
    // El gradiente ámbar→primary se aplica con ::before via CSS
    // Usamos un wrapper con overflow-hidden para que respete el border-radius
    "relative bg-card border border-card-border rounded-lg overflow-hidden shadow-card",
};

/**
 * Tarjeta base del design system.
 *
 * Variante `gradient`: aplica el gradiente ámbar→primary como overlay sutil.
 * Usá esta variante para "quick access" cards del dashboard.
 */
export const Card: React.FC<CardProps> = ({
  variant = "default",
  className = "",
  children,
  onClick,
}) => {
  if (variant === "gradient") {
    return (
      <div
        className={[variantClasses.gradient, className].filter(Boolean).join(" ")}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {/* Overlay de gradiente (ámbar → primary) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
          }}
        />
        {/* Contenido por encima del overlay */}
        <div className="relative p-xl">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={[variantClasses[variant], "p-xl", className].filter(Boolean).join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};
