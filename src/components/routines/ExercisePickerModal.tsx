"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { searchExercises } from "@/lib/api/exercises";
import type { ExerciseCatalogItem } from "@/lib/api/exercises";
import type { ExerciseType } from "@/lib/api/types";

interface ExercisePickerModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Callback cuando el usuario elige un ejercicio del catálogo.
   * Recibe el item seleccionado.
   */
  onSelect: (exercise: ExerciseCatalogItem, exerciseType: ExerciseType) => void;
}

const EXERCISE_TYPE_OPTIONS: { value: ExerciseType; label: string }[] = [
  { value: "weight", label: "Peso" },
  { value: "timed", label: "Tiempo" },
  { value: "superset", label: "Superset" },
  { value: "custom", label: "Custom" },
];

/**
 * ExercisePickerModal — modal con buscador de ejercicios del catálogo.
 * Llama a searchExercises con debounce y permite elegir el tipo al seleccionar.
 */
export const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ExerciseCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExerciseCatalogItem | null>(null);
  const [selectedType, setSelectedType] = useState<ExerciseType>("weight");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await searchExercises({ q: q || undefined, page: 1 });
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial al abrir
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedItem(null);
      setSelectedType("weight");
      doSearch("");
    }
  }, [open, doSearch]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(val);
    }, 350);
  };

  const handlePickExercise = (ex: ExerciseCatalogItem) => {
    setSelectedItem(ex);
  };

  const handleConfirm = () => {
    if (!selectedItem) return;
    onSelect(selectedItem, selectedType);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar ejercicio" size="md">
      <div className="flex flex-col gap-lg" style={{ minHeight: 0 }}>
        {/* Buscador */}
        <div className="relative">
          <span className="absolute left-md top-1/2 -translate-y-1/2 text-fg-tertiary flex items-center pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Buscar ejercicio por nombre..."
            className="w-full h-11 bg-fill-tertiary text-fg placeholder-fg-tertiary border border-transparent rounded-md text-base outline-none transition-colors duration-150 focus:border-primary focus:bg-fill-quaternary pl-10 pr-md"
            autoFocus
          />
        </div>

        {/* Lista de resultados */}
        <div
          className="overflow-y-auto flex flex-col gap-xs"
          style={{ maxHeight: "320px" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-xl text-fg-tertiary gap-sm">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Buscando...</span>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-fg-tertiary text-center py-xl">
              {query ? "No se encontraron ejercicios." : "Escribí para buscar ejercicios."}
            </p>
          ) : (
            items.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => handlePickExercise(ex)}
                className={[
                  "flex items-center justify-between gap-md px-md py-sm rounded-md text-left transition-colors duration-150",
                  selectedItem?.id === ex.id
                    ? "border border-primary"
                    : "border border-transparent hover:border-primary hover:bg-primary-alpha-08",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  background:
                    selectedItem?.id === ex.id
                      ? "var(--primary-alpha-08)"
                      : "var(--fill-tertiary)",
                }}
              >
                <span className="text-base text-fg font-medium">{ex.name}</span>
                <div className="flex items-center gap-xs flex-shrink-0">
                  {ex.muscle_group && (
                    <Badge variant="neutral" size="sm">
                      {ex.muscle_group}
                    </Badge>
                  )}
                  {ex.is_custom && (
                    <Badge variant="primary" size="sm">
                      Custom
                    </Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Tipo de ejercicio (solo cuando se eligió un ítem) */}
        {selectedItem && (
          <div className="flex flex-col gap-sm">
            <p className="text-sm font-medium text-fg-secondary m-0">
              Tipo de ejercicio para <strong className="text-fg">{selectedItem.name}</strong>:
            </p>
            <div className="flex gap-xs flex-wrap">
              {EXERCISE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedType(opt.value)}
                  className="px-md py-xs rounded-pill text-sm font-medium transition-colors border"
                  style={
                    selectedType === opt.value
                      ? {
                          background: "var(--primary-alpha-12)",
                          borderColor: "var(--primary)",
                          color: "var(--primary)",
                        }
                      : {
                          background: "var(--fill-tertiary)",
                          borderColor: "transparent",
                          color: "var(--fg-secondary)",
                        }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col gap-sm pt-sm" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
          {selectedItem && (
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={handleConfirm}
            >
              Agregar {selectedItem.name}
            </Button>
          )}

          {/* CTA crear ejercicio personalizado */}
          <Link
            href="/exercises/new"
            onClick={onClose}
            className="flex items-center justify-center gap-xs rounded-pill px-xl h-11 text-base font-semibold text-fg-secondary border transition-colors duration-150"
            style={{
              background: "var(--fill-tertiary)",
              borderColor: "transparent",
            }}
          >
            <Plus size={16} />
            Crear ejercicio personalizado
          </Link>
        </div>
      </div>
    </Modal>
  );
};
