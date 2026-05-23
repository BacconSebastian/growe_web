import React from "react";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  /** URL de imagen del avatar. Si no se provee, muestra las iniciales. */
  src?: string | null;
  /** Iniciales para mostrar cuando no hay imagen (ej: "AC") */
  initials?: string;
  /** Alt para la imagen */
  alt?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: "w-7 h-7", text: "text-xs" },
  md: { container: "w-9 h-9", text: "text-sm" },
  lg: { container: "w-14 h-14", text: "text-lg" },
  xl: { container: "w-24 h-24", text: "text-xxl" },
};

/**
 * Avatar circular con gradiente ámbar→primary + iniciales.
 * Si se provee `src`, muestra la imagen; si no, muestra las iniciales.
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  initials = "?",
  alt = "Avatar",
  size = "md",
  className = "",
}) => {
  const { container, text } = sizeClasses[size];

  return (
    <div
      className={[
        "rounded-pill flex items-center justify-center overflow-hidden flex-shrink-0",
        container,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: src
          ? undefined
          : "linear-gradient(135deg, var(--flame), var(--primary))",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className={["text-white font-semibold select-none", text]
            .filter(Boolean)
            .join(" ")}
        >
          {initials.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
};
