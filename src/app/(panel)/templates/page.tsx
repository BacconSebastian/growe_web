"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonBox } from "@/components/ui/Skeleton";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { listCoachTemplates } from "@/lib/api/coaching";
import { getErrorMessage } from "@/lib/utils";
import type { CoachTemplate } from "@/lib/api/types";

type CategoryFilter = "all" | string;

/**
 * /templates — Lista de templates del coach.
 * Espejo web de mobile/app/coaching/templates/index.tsx.
 */
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CoachTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCoachTemplates();
      setTemplates(data);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar los templates."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Categorías únicas para los chips de filtro
  const categories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [templates]);

  // Filtrado client-side por búsqueda + categoría
  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          (t.category ?? "").toLowerCase().includes(term) ||
          (t.description ?? "").toLowerCase().includes(term)
      );
    }

    return result;
  }, [templates, categoryFilter, search]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    // Reset categoría si cambia búsqueda para evitar resultados vacíos confusos
  };

  const hasTemplates = templates.length > 0;
  const hasResults = filteredTemplates.length > 0;
  const isFiltering = search.trim() !== "" || categoryFilter !== "all";

  return (
    <div className="flex flex-col gap-xxl">
      {/* Header */}
      <div className="flex items-start justify-between gap-lg flex-wrap">
        <div>
          <h1
            className="text-display font-bold tracking-tight m-0"
            style={{ letterSpacing: "-0.4px" }}
          >
            Mis templates
          </h1>
          <p className="text-base text-fg-secondary mt-xs m-0">
            Plantillas de rutinas y planificaciones para aplicar a alumnos
          </p>
        </div>

        <Link href="/templates/new">
          <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
            Nuevo template
          </Button>
        </Link>
      </div>

      {/* Filtros — solo si hay templates */}
      {!loading && hasTemplates && (
        <div className="flex gap-md items-center flex-wrap">
          <div className="flex-1" style={{ maxWidth: "360px" }}>
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar template por nombre..."
            />
          </div>

          {categories.length > 0 && (
            <div className="flex gap-sm flex-wrap">
              <Chip
                active={categoryFilter === "all"}
                onClick={() => setCategoryFilter("all")}
              >
                Todas ({templates.length})
              </Chip>
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  active={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && <ErrorBanner message={error} dismissible />}

      {/* Contenido */}
      {loading ? (
        <div
          className="grid gap-lg"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBox key={i} height={180} />
          ))}
        </div>
      ) : !hasTemplates ? (
        /* Empty state cuando no hay NINGÚN template */
        <EmptyState
          icon={<Layers size={24} />}
          title="Todavía no tenés templates"
          description="Creá templates desde rutinas o planificaciones para reutilizarlos fácilmente y aplicarlos a tus alumnos."
          action={
            <Link href="/templates/new">
              <Button variant="primary" size="md" iconLeft={<Plus size={16} />}>
                Crear mi primer template
              </Button>
            </Link>
          }
        />
      ) : !hasResults && isFiltering ? (
        /* Empty state de búsqueda sin match */
        <EmptyState
          icon={<Layers size={24} />}
          title="Sin resultados"
          description="No encontramos templates que coincidan con tu búsqueda. Probá con otros términos o cambiá el filtro de categoría."
        />
      ) : (
        <>
          <div
            className="grid gap-lg"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                href={`/templates/${template.id}`}
              />
            ))}

            {/* CTA card dashed */}
            <Link
              href="/templates/new"
              className="flex flex-col items-center justify-center gap-md p-xxl rounded-lg text-center group"
              style={{
                background: "var(--card)",
                border: "1.5px dashed var(--separator)",
                minHeight: "180px",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "var(--primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "var(--separator)";
              }}
            >
              <div
                className="w-12 h-12 rounded-pill flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                }}
              >
                <Plus size={20} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <p className="text-base font-semibold text-fg m-0">
                  Crear template nuevo
                </p>
                <p className="text-sm text-fg-tertiary m-0 mt-xxs">
                  Desde una rutina o planificación existente.
                </p>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
