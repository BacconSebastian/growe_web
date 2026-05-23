import type { Metadata } from "next";
import "@/styles/globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "Growe Coach",
  description: "Panel administrativo para coaches de Growe",
  icons: {
    icon: "/favicon.png",
  },
};

/**
 * Root layout: envuelve toda la app con ThemeProvider y AuthProvider.
 * Los tokens CSS y el tema se aplican sobre <html> via ThemeContext.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
