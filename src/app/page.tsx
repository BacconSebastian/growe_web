"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isCoach } from "@/lib/utils";

/**
 * Página raíz: redirige según estado de autenticación.
 * - Inicializando → spinner mientras valida tokens.
 * - Sin user (o no coach) → /login.
 * - User coach → /dashboard.
 */
export default function RootPage() {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    if (!user || !isCoach(user)) {
      router.replace("/login");
    } else {
      router.replace("/dashboard");
    }
  }, [user, initializing, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <span className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
