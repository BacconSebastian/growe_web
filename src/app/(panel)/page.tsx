"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * `/` dentro del route group (panel) redirige a /dashboard.
 * La ruta canónica del dashboard es /dashboard.
 */
export default function PanelIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
