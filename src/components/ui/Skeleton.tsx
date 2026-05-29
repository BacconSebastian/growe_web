"use client";

import React from "react";

interface SkeletonLineProps {
  width?: string | number;
  height?: number;
  className?: string;
}

interface SkeletonCircleProps {
  size?: number;
  className?: string;
}

interface SkeletonBoxProps {
  width?: string | number;
  height?: number | string;
  className?: string;
}

/**
 * SkeletonLine — línea shimmer horizontal.
 * Usa animate-pulse de Tailwind + bg-fill-quaternary (alpha bajo).
 */
export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = "100%",
  height = 14,
  className = "",
}) => {
  return (
    <div
      className={["rounded-sm animate-pulse", className].filter(Boolean).join(" ")}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: `${height}px`,
        background: "var(--fill-quaternary)",
      }}
    />
  );
};

/**
 * SkeletonCircle — círculo shimmer para avatares.
 */
export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 36,
  className = "",
}) => {
  return (
    <div
      className={["rounded-pill animate-pulse flex-shrink-0", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: "var(--fill-quaternary)",
      }}
    />
  );
};

/**
 * SkeletonBox — caja shimmer rectangular para cards, imágenes.
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = "100%",
  height = 80,
  className = "",
}) => {
  return (
    <div
      className={["rounded-md animate-pulse", className].filter(Boolean).join(" ")}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        background: "var(--fill-quaternary)",
      }}
    />
  );
};
