# web/CLAUDE.md

Guía para Claude Code trabajando en el **panel web del coach** (`web/`).

## ⚠️ Principio rector (OBLIGATORIO)

El panel web **SIEMPRE replica el funcionamiento de la app mobile**. Es la misma
app que `mobile/`, pero en formato web y **exclusivamente para coachs** (Profesor,
role_id 2). No se inventan features ni flujos nuevos: cada vista, flujo y regla de
negocio del web debe corresponder 1:1 con su equivalente en mobile.

**Lo único que puede cambiar** entre mobile y web:

1. **La forma de mostrar la información** (layout, densidad, navegación adaptada a
   pantalla grande / desktop).
2. **Las herramientas/affordances de interacción** (tablas, multi-select, paginación,
   atajos de teclado, etc. propios de web).

Todo lo demás — lógica, contratos de API, semántica, reglas de permisos — se copia
de mobile. Antes de implementar cualquier vista del web, **buscar primero cómo lo
hace mobile** (`mobile/app/`, `mobile/components/`, `mobile/lib/`) y reproducir ese
comportamiento. Si mobile no tiene la feature, no va en el web (salvo pedido
explícito del usuario).

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
- **Copy en español rioplatense (NO neutro):** todo texto visible al usuario
  (labels, tooltips, mensajes, confirmaciones) usa el voseo/rioplatense. Nunca
  español neutro. Ej: usar **"acá"** (no "aquí"), "agregá"/"poné" (no
  "agrega"/"pon"), "tenés" (no "tienes").

---

## Resolución de nombres de contactos — Aliases (MANDATORY)

El panel resuelve nombres con la prioridad **alias > nombre completo > username**, igual que mobile (`mobile/lib/display-name.ts`).

**Helpers en `src/lib/utils.ts`:**

- `getDisplayName(user, aliases?)` — alias > fullName > username > `"Usuario"`.
- `getDisplaySubtitle(user, aliases?)` — con alias: `"fullName · username"`; sin alias y con fullName: username; sin ambos: `null`.
- `UserLike` tiene `id?: number` opcional; sin `id` no se resuelve alias (usado a propósito para el usuario propio del coach).

**Infraestructura:**

- `src/lib/api/aliases.ts` — `getAliases()` → `AliasMap` (`Record<number, string>`), vía `GET /community/aliases`. Solo lectura; editar aliases es exclusivo de mobile.
- `src/contexts/AliasContext.tsx` — `AliasProvider` montado en `(panel)/layout.tsx` (dentro de `RequireCoach`). Hook: `const { aliases, getAlias, refresh } = useAliases()`.

**Regla para vistas nuevas:** cualquier vista o listado que muestre nombres de contactos (alumnos, coaches, miembros de grupo) DEBE pasar `aliases` de `useAliases()` a `getDisplayName`. Esto incluye los filtros de búsqueda client-side para que el término matchee también el alias. El saludo del coach y su propio perfil **no** pasan aliases.

---

## Paridad mobile ↔ web (MANDATORY)

El panel web debe **replicar el lenguaje visual de mobile** para los componentes
de entrenamiento, no inventar uno propio. Antes de diseñar/editar un componente
que ya existe en mobile, **revisar su equivalente** en `mobile/components/` y
mantener la misma semántica de color, estructura e íconos.

### Convención de color (espejo de mobile)

| Concepto | Color | Token web | Mobile ref |
|---|---|---|---|
| **Superset / ejercicios combinados** | ámbar | `--warning` (+ `--warning-alpha-12/20/30`) | `SupersetGroupBorder` variant `"superset"` |
| **Variantes / suplentes** | azul | `--primary` (+ `--primary-alpha-12/20`) | `SupersetGroupBorder` variant `"variants"` / `VariantSelector` |
| **Acción destructiva** (separar grupo, quitar) | rojo | `--destructive` (+ `--destructive-alpha-12`) | `Unlink2` rojo |

### Superset (ejercicios combinados)

Replica `mobile/components/workout/SupersetGroupBorder.tsx`. El markup canónico
vive en el componente compartido `web/src/components/routines/SupersetGroupSection.tsx`,
usado por ambos editores (`RoutineEditor.tsx` y `WeekRoutineExercisesEditor.tsx`).
**NO** reintroducir una caja con borde ni duplicar el JSX — cualquier vista nueva que
muestre un grupo superset debe usar `SupersetGroupSection`.

- **NO** envolver los miembros en una caja con borde (evitar "caja dentro de caja").
- **Acento ámbar** vertical a la izquierda del grupo: barra de 3px `rounded-full`
  `self-stretch` en `--warning`.
- **Chip pill** (no texto plano): `rounded-pill`, fondo `--warning-alpha-12`,
  borde `--warning-alpha-30`, con ícono `Link2` + texto **"Superset · N ejercicios"**
  en `--warning`. El "Separar" va dentro del chip, separado por un divisor
  (`--warning-alpha-30`), como icon-button `Unlink2` en `--destructive`.
- Los ejercicios del grupo van como cards apiladas (`gap-sm`) debajo del chip.

**Helpers de mutación (`src/lib/superset-edit.ts`):**
- Helpers planos (`combineIntoGroup`, `ungroupSuperset`, `removeFromSupersetGroup`) — usados por el editor de plannings.
- Helpers a nivel grupo-de-variantes (`combineGroupsIntoSuperset`, `removeGroupFromSuperset`) — usados por el editor de rutinas.

### Variantes (suplentes)

Replica `mobile/components/workout/VariantSelector.tsx` (en
`web/src/components/routines/ExerciseBlock.tsx`):

- Selector segmentado con label **"VARIANTES"** en `--primary`.
- Variante activa resaltada en azul (`--primary-alpha-12` / `--primary`), no en gris.
- Badge "N variantes" (card colapsada) en `variant="primary"`.
- Fallback de nombres: `"Principal"` / `"Suplente N"`.

### Íconos (lucide, espejo de mobile)

`Link2` (combinar/superset), `Unlink2` (separar grupo), `Settings2` (variables),
`History` (últimos valores), `CalendarClock` (semana pasada).
