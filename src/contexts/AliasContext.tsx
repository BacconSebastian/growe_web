"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAliases, type AliasMap } from "@/lib/api/aliases";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AliasContextValue {
  aliases: AliasMap;
  getAlias: (targetId: number) => string | undefined;
  refresh: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AliasContext = createContext<AliasContextValue | null>(null);

export function AliasProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const [aliases, setAliases] = useState<AliasMap>({});

  const loadAliases = useCallback(async () => {
    try {
      const map = await getAliases();
      setAliases(map);
    } catch (err) {
      // Fallo silencioso — la carga de aliases no debe bloquear el panel
      console.warn("No se pudieron cargar los aliases", err);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setAliases({});
      return;
    }
    void loadAliases();
  }, [accessToken, loadAliases]);

  const getAlias = useCallback(
    (targetId: number): string | undefined => aliases[targetId],
    [aliases],
  );

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    await loadAliases();
  }, [accessToken, loadAliases]);

  const value = useMemo<AliasContextValue>(
    () => ({ aliases, getAlias, refresh }),
    [aliases, getAlias, refresh],
  );

  return (
    <AliasContext.Provider value={value}>
      {children}
    </AliasContext.Provider>
  );
}

export function useAliases(): AliasContextValue {
  const ctx = useContext(AliasContext);
  if (!ctx) {
    throw new Error("useAliases debe usarse dentro de AliasProvider");
  }
  return ctx;
}
