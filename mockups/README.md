# Growe Web — Mockups

Mockups HTML/CSS estáticos del panel administrativo para coaches.
Son una **referencia visual**, no código de producción.

## Cómo abrirlos localmente

Cada `.html` es autocontenido (links a `shared/tokens.css` y `shared/components.css`).
Doble click sobre el archivo, o desde la terminal:

```bash
open 01-login.html   # macOS
xdg-open 01-login.html  # linux
```

Recomendado usar un servidor local rápido para evitar restricciones de `file://`:

```bash
cd web/mockups
python3 -m http.server 8000
# Abrir http://localhost:8000/02-dashboard.html
```

## Toggle dark / light

Cada pantalla incluye un botón con ícono sol (esquina superior derecha o topbar).
El toggle setea `document.documentElement.dataset.theme` a `"dark"` o `"light"`.
Los tokens en `shared/tokens.css` reaccionan automáticamente.

Default: **dark** (matchea el look del mobile).

## Estructura

```
mockups/
├── README.md                ← este archivo
├── shared/
│   ├── tokens.css           ← CSS vars: paleta dark+light, spacing, radius, typography
│   └── components.css       ← clases utility: .btn, .card, .input, .sidebar, etc.
├── 01-login.html
├── 02-dashboard.html
├── 03-students-list.html
├── 04-student-detail.html
├── 05-routines-list.html
├── 06-routine-editor.html
├── 07-plannings-list.html
└── 08-planning-editor.html
```

Las pantallas están enlazadas: el sidebar y los CTAs navegan entre archivos. Podés
recorrer todo el panel haciendo click.

## Cómo importar a Figma

### Opción A — Plugin `html.to.design` (recomendado)

1. Instalar en Figma desde [html.to.design](https://www.figma.com/community/plugin/1159123024924461424/html-to-design).
2. Crear/abrir un archivo Figma.
3. Plugin → Menu → Plugins → html.to.design.
4. Elegir "Import from URL" y pegar `http://localhost:8000/01-login.html` (mientras corre `python3 -m http.server`).
5. El plugin importa cada pantalla como un frame con capas semánticas (DIV, BUTTON, etc.).

Repetir para cada `.html`. Cada pantalla queda como un frame independiente
(1440×900 base recomendado en Figma).

### Opción B — Screenshot

Si el plugin no funciona o querés iterar más rápido en visual:
1. Abrir cada `.html` en Chrome.
2. DevTools → Cmd+Shift+P → "Capture full size screenshot".
3. Arrastrar el PNG a Figma como imagen.

Esta opción es más rápida pero no preserva capas editables.

## Convenciones

- **Dimensiones base:** desktop 1440×900. Las pantallas usan `grid` y se adaptan
  hasta 768px (tablet). Mobile no está optimizado (el panel está pensado para
  desktop/tablet).
- **Paleta:** dark mode (mobile default). Toggle a light disponible siempre.
- **Tipografía:** -apple-system / SF Pro Display. Si Figma no las tiene, fallback
  a Inter / Helvetica.
- **Botones:** todos pill-shaped (`border-radius: 9999px`).
- **Cards:** `border-radius: 16px`, sombra suave, borde `rgba(255,255,255,0.06)` en dark.
- **Spacing:** múltiplos de 4px (xxs=2, xs=4, sm=8, md=12, lg=16, xl=20, xxl=24, xxxl=32).

## Tokens visuales (referencia rápida)

| Token             | Dark            | Light            |
|-------------------|-----------------|------------------|
| `--primary`       | `#0A84FF`       | `#007AFF`        |
| `--success`       | `#30D158`       | `#34C759`        |
| `--destructive`   | `#FF453A`       | `#FF3B30`        |
| `--warning`       | `#FF9F0A`       | `#FF9500`        |
| `--bg`            | `#000000`       | `#F2F2F7`        |
| `--card`          | `#1C1C1E`       | `#FFFFFF`        |
| `--fg`            | `#FFFFFF`       | `#000000`        |
| `--flame`         | `#E5A430`       | `#D49428`        |

Ver `shared/tokens.css` para el set completo (paletas + alphas + gradientes).

## Iconografía

Todos los íconos son SVG inline de [lucide.dev](https://lucide.dev) — la misma
librería que usa el mobile (`lucide-react-native`). Si necesitás otro ícono,
copialo desde lucide y pegalo inline en el HTML.

## Pantallas

1. **01-login.html** — Login con email/contraseña. Card centrada con gradiente de
   fondo + theme toggle en esquina.
2. **02-dashboard.html** — Sidebar + topbar + 4 stat cards + solicitudes pendientes
   + alumnos recientes + accesos rápidos a las 3 áreas.
3. **03-students-list.html** — Tabla de alumnos con búsqueda, filtros chip,
   adherencia y status. Paginación inferior.
4. **04-student-detail.html** — Perfil completo del alumno: header con avatar,
   tabs (Resumen visible), stats, heatmap, rutinas asignadas, planning activa.
5. **05-routines-list.html** — Grid de rutinas templates del coach con badge de
   "asignada a N alumnos" y empty state CTA.
6. **06-routine-editor.html** — Editor: nombre inline, días, lista de ejercicios
   (uno expandido con sets table editable, resto colapsados, un superset). Side
   panel con alumnos asignados.
7. **07-plannings-list.html** — Grid de plannings con status badges (Activa /
   Borrador / Programada), duración, asignaciones.
8. **08-planning-editor.html** — Grid 8 semanas × 7 días. Selector de semana
   actual + acciones (copiar semana, aplicar a todas). Side panel con ejercicios
   de la rutina seleccionada + alumnos asignados.

## Próximos pasos

Después de aprobar visualmente los mockups, las próximas fases son:

1. **Fase 1**: scaffold Next.js + design tokens + layout shell + login (real).
2. **Fase 2**: dashboard + lista de alumnos + detalle alumno (read-only).
3. **Fase 3**: edición de rutinas del alumno.
4. **Fase 4**: edición de plannings del alumno.
5. **Fase 5**: rutinas/plannings propias del coach.

Detalles arquitecturales en [../PLANNING.md](../PLANNING.md).
