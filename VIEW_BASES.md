# VIEW_BASES.md

Bases de diseño/UX para las **vistas del panel web** (Next.js, `web/src/app/(panel)/`).

> **Regla:** al crear o editar cualquier vista del panel, seguir estas bases.
> Sirven para que todas las secciones (Dashboard, Alumnos, Rutinas, …) compartan
> el mismo lenguaje visual y comportamiento. Si una vista necesita romper una
> base, dejar un comentario explicando por qué.

Referencia de implementación ya hecha: **Dashboard**, **Alumnos** y **Rutinas**.

---

## 1. Barra de controles (búsqueda + filtros + acciones)

- Búsqueda, chips/selects de filtro y botones de acción van **en un mismo
  contenedor/fila**, en una sola línea (`flex items-center gap-md`).
- **Todos ovalados** (`rounded-pill`) y de **la misma altura** (`h-11` = 44px):
  - Buscador → componente `SearchInput` (ya es pill, `h-11`).
  - Filtros → `MultiSelect` (`@/components/ui/MultiSelect`, pill, `h-11`) o chips pill.
  - Botones de acción → `Button` (pill por defecto), `size="md"` (`h-11`).
- Los **botones de acción van a la derecha** (`ml-auto flex-shrink-0`).
- Sin título/subtítulo en el cuerpo de la vista: el título vive en el **Topbar**
  (ver `(panel)/layout.tsx`).

```tsx
<div className="flex items-center gap-md">
  <SearchInput value={q} onChange={setQ} className="w-72 flex-shrink-0" />
  <MultiSelect options={...} selected={...} onChange={...} placeholder="Filtro" />
  <Button variant="primary" size="md" className="ml-auto flex-shrink-0">Acción</Button>
</div>
```

---

## 2. Contenedores y cards: tamaño constante

- **Las cards de un mismo listado miden todas lo mismo** (alto fijo, no
  contenido-dependiente). Patrón: alto fijo + `flex flex-col`, con el bloque de
  título en `flex-1` y el footer al pie. Ej: `ROUTINE_CARD_HEIGHT` en `RoutineCard`.
- **El contenedor mide siempre lo mismo**, sin importar cuántos elementos tenga
  la página actual. Se reserva el alto de **una página completa** con `min-height`
  (en grids, por breakpoint según la cantidad de columnas). Así la última página
  (con menos items) no encoge el contenedor.

---

## 3. Listados paginados → siempre dentro de un contenedor

- Cuando una vista muestra **muchos elementos del mismo estilo y tiene paginación**,
  van **wrapeados en un contenedor** `GradientSurface` (`@/components/ui/GradientSurface`).
- Estructura: `GradientSurface` → [cuerpo: lista/grid de items] → [footer: paginación].
- El cuerpo lista filas (estilo Alumnos) o un grid de cards (estilo Rutinas); las
  cards llevan el **gradiente característico** (base transparente + overlay
  `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))` + borde
  `--card-border-light`) — nunca gris plano.

---

## 4. Paginación: componente único, siempre en el mismo lugar

- **Reutilizar SIEMPRE** el componente `Pagination` (`@/components/ui/Pagination`).
  Nunca reimplementar controles de paginación.
- Va como **footer del contenedor**, con `borderTop: 1px solid var(--separator-subtle)`.
- **🔴 REGLA INNEGOCIABLE — la paginación SIEMPRE se renderiza si la lista usa
  paginación, AUNQUE haya una sola página (o ninguna).** Nunca condicionar su
  render con `total > PER_PAGE` ni similar. El componente `Pagination` ya
  deshabilita "Anterior/Siguiente" cuando no aplica — esa es la única señal de
  "no hay más páginas". Esto vale **también dentro de modales** (ej. modales de
  detalle de métricas del Dashboard) y en cualquier listado paginado.
- Como el contenedor tiene alto fijo (base #2), **la paginación queda siempre en
  el mismo lugar** entre páginas.
- Filtros/búsqueda/paginación son **server-side** cuando el listado está paginado
  (no filtrar client-side solo la página actual). Cualquier cambio de filtro
  resetea a `page = 1`.

---

## 5. Skeletons fieles al contenido final

- El skeleton debe **espejar el layout real**: mismo contenedor (`GradientSurface`),
  misma cantidad de filas/cards por página, **misma altura de fila/card**, mismo
  grid/columnas, y un **shell de paginación** al pie.
- Objetivo: cero salto de layout (CLS) al pasar de `loading` a cargado.

---

## Tokens / componentes de referencia

- Superficie con gradiente: `GradientSurface`
- Paginación: `Pagination`
- Filtros multiselección: `MultiSelect`
- Búsqueda: `SearchInput`
- Botón (pill por defecto): `Button` (`variant`, `size`)
- Métricas clickeables → modal de detalle: `StatCard` (`onClick`) + `MetricDetailModal`
- Modales: `Modal` (ya tiene el tinte de gradiente; botones de modal a `md`,
  secundarios "Cancelar/Cerrar" `sm` alineados a la derecha)
- Gradiente característico: `--gradient-start` → `--gradient-end` (ámbar → primary)
- Cero colores hardcodeados: usar tokens CSS (`var(--…)`). TypeScript estricto, sin `as any`.
