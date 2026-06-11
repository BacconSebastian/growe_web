# web/CLAUDE.md

Guía para Claude Code trabajando en el **panel web del coach** (`web/`).

## Stack

- **Next.js (App Router) + TypeScript**, React client components (`"use client"`).
- Tailwind con tokens custom (no hex/rgba hardcodeado: usar `var(--…)`).
- TypeScript estricto: **prohibido `as any`**.

## Estructura

- `src/app/(panel)/` — vistas del panel (dashboard, students, routines, plannings,
  groups, templates, exercises, profile). Layout en `(panel)/layout.tsx`
  (`RequireCoach` + `Sidebar` + `Topbar`; el **título de la vista vive en el Topbar**).
- `src/components/ui/` — design system: `GradientSurface`, `Pagination`,
  `MultiSelect`, `SearchInput`, `Button` (pill por defecto), `Modal`, `StatCard`,
  `Avatar`, `Badge`, `Chip`, `Skeleton`, `Table`, etc.
- `src/components/<dominio>/` — componentes por dominio (coaching, routines, …).
- `src/lib/api/` — capa de API. **Todas las requests via `http.ts`** (inyecta
  `Authorization: Bearer`, auto-refresh en 401). `config.ts` → `API_BASE_URL`
  (`NEXT_PUBLIC_API_BASE_URL`, dev `http://localhost:3001/api`).
- `src/styles/{tokens.css,globals.css}` — tokens espejados de `mobile/constants/colors.ts`
  (dark default, `[data-theme="light"]`). Gradiente característico:
  `--gradient-start` → `--gradient-end` (ámbar → primary).

## Auth / acceso

- Solo **Profesor (role_id 2)** entra al panel (`RequireCoach`). Auth en `AuthContext`.

## Contrato de API

- `httpFetch<T>(path)` desenvuelve `{ success, data }` y devuelve `data`.
- Listados paginados: `{ items, pagination: { page, per_page, total, total_pages } }`.

---

## ⚠️ Bases de vistas (OBLIGATORIO)

Al **crear o editar cualquier vista** del panel, seguir SIEMPRE las reglas de
[`VIEW_BASES.md`](VIEW_BASES.md):

1. Barra de controles (buscador + filtros + acciones) en una fila, **ovalados
   (`rounded-pill`)** y de **misma altura (`h-11`)**, con los botones de acción a la
   **derecha** (`ml-auto`). Título en el Topbar, no en el cuerpo.
2. **Cards y contenedores de tamaño fijo** (alto reservado para una página completa).
3. Listados paginados → **wrapeados en `GradientSurface`** (cards con gradiente, no gris plano).
4. **Paginación**: reusar el componente `Pagination`, como footer del contenedor,
   siempre visible y **siempre en el mismo lugar**. Filtros/búsqueda/paginación server-side.
5. **Skeletons fieles** al layout final (mismo contenedor, alturas, grid y shell de paginación).

Referencia ya implementada: **Dashboard**, **Alumnos**, **Rutinas**.

---

## Reglas generales

- Reutilizar componentes del design system antes de crear uno nuevo.
- No ejecutar tests/builds destructivos sin pedido explícito (`tsc --noEmit` para verificar tipos es OK).
- Errores user-facing: `getErrorMessage()` de `lib/utils`.
