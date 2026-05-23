import React from "react";

/**
 * Shell de autenticación: sin sidebar, fondo con gradiente radial,
 * contenido centrado horizontal y verticalmente.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-xxl relative"
      style={{ background: "var(--bg)" }}
    >
      {/* Gradiente radial de fondo (ámbar arriba-izq + primary abajo-der) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, var(--gradient-start), transparent 50%), " +
            "radial-gradient(circle at 80% 80%, var(--gradient-end), transparent 50%)",
        }}
      />

      {/* Contenido */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
