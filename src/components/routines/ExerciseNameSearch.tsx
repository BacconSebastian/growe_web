"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { searchExercises } from "@/lib/api/exercises";
import type { ExerciseCatalogItem } from "@/lib/api/exercises";

interface ExerciseNameSearchProps {
  /** Se llama al elegir un ejercicio del catálogo o un nombre libre.
   *  exerciseId es null cuando el usuario usa un nombre libre ("Usar este nombre"). */
  onSelect: (name: string, exerciseId: number | null) => void;
  /** Cancelar: Esc o click afuera. */
  onCancel: () => void;
}

/**
 * ExerciseNameSearch — buscador inline que reemplaza el nombre del ejercicio
 * (igual que mobile). Se abre un input con dropdown flotante de resultados.
 *
 * El dropdown se posiciona con `position: fixed` anclado al input (vía
 * getBoundingClientRect) para escapar del `overflow-hidden` del GradientSurface.
 */
export const ExerciseNameSearch: React.FC<ExerciseNameSearchProps> = ({
  onSelect,
  onCancel,
}) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ExerciseCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await searchExercises({ q: q || undefined });
      setItems(res.items.slice(0, 12));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Focus inicial
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Mantener el dropdown anclado a la caja del buscador
  useEffect(() => {
    const update = () => {
      if (boxRef.current) setRect(boxRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Click afuera → cancelar
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      onCancel();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onCancel]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const trimmed = query.trim();
  const showDropdown =
    rect !== null && (loading || items.length > 0 || trimmed.length >= 0);

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-0">
      <div
        ref={boxRef}
        className="flex items-center gap-sm h-9 px-md rounded-sm max-w-[340px]"
        style={{ background: "var(--fill-tertiary)" }}
      >
        <Search size={16} className="text-fg-tertiary flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Buscar ejercicio..."
          className="flex-1 min-w-0 bg-transparent text-base text-fg placeholder-fg-tertiary outline-none"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (items.length > 0) onSelect(items[0].name, items[0].id);
              else if (trimmed.length >= 1) onSelect(trimmed, null);
            }
          }}
        />
      </div>

      {showDropdown && rect && (
        <div
          ref={dropdownRef}
          className="flex flex-col overflow-y-auto rounded-md"
          style={{
            position: "fixed",
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            maxHeight: 300,
            zIndex: 1000,
            background: "var(--bg-elevated)",
            border: "1px solid var(--separator)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-sm py-lg text-fg-tertiary">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Buscando...</span>
            </div>
          ) : (
            <>
              {items.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => onSelect(ex.name, ex.id)}
                  className="flex flex-col items-start gap-xxs px-md py-sm text-left transition-colors hover:bg-primary-alpha-08"
                  style={{ borderBottom: "1px solid var(--separator-subtle)" }}
                >
                  <span className="text-base text-fg">{ex.name}</span>
                  {ex.muscle_group && (
                    <span
                      className="text-xxs px-xs py-xxs rounded-sm"
                      style={{
                        background: "var(--fill-tertiary)",
                        color: "var(--fg-secondary)",
                      }}
                    >
                      {ex.muscle_group}
                    </span>
                  )}
                </button>
              ))}

              {trimmed.length >= 1 && (
                <button
                  type="button"
                  onClick={() => onSelect(trimmed, null)}
                  className="flex flex-col items-start gap-xxs px-md py-sm text-left transition-colors hover:bg-primary-alpha-08"
                >
                  <span className="text-base italic" style={{ color: "var(--primary)" }}>
                    &ldquo;{trimmed}&rdquo;
                  </span>
                  <span className="text-xxs text-fg-tertiary">Usar este nombre</span>
                </button>
              )}

              {items.length === 0 && trimmed.length === 0 && (
                <p className="text-sm text-fg-tertiary text-center py-lg m-0">
                  Escribí para buscar ejercicios
                </p>
              )}

              {items.length === 0 && trimmed.length >= 1 && !loading && (
                <p className="text-sm text-fg-tertiary text-center py-sm m-0">
                  Sin resultados en el catálogo
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
