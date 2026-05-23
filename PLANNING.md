# Growe Web — PLANNING

> Documento de arquitectura para el panel administrativo web de Growe.
> Esta es la **referencia única** para arrancar la implementación en Fase 1.

---

## 1. Contexto y objetivo

**Growe** es una app de fitness con dos tipos de usuario relevantes:

- **Profesores (coaches, `role_id = 2`)** que gestionan a sus alumnos.
- **Alumnos (`role_id = 3`)** que entrenan en la app mobile.

La app mobile (React Native / Expo) ya cubre ambos roles, pero los coaches
necesitan una herramienta más cómoda para gestionar a múltiples alumnos, editar
rutinas y diseñar planificaciones en pantallas grandes con teclado.

**Objetivo del web:** ofrecer un **panel administrativo desktop** dedicado a
coaches, con paridad funcional sobre tres áreas críticas:

1. **Alumnos** — ver, gestionar y monitorear.
2. **Rutinas** — crear y editar templates reutilizables, asignar a alumnos.
3. **Planificaciones** — diseñar ciclos por semanas y asignar.

El web reutiliza el backend existente (`/api/coaching/*`, `/api/routines`,
`/api/plannings`, `/api/auth/*`). **No** hay servidor propio del web — es un SPA
Next.js que habla con la misma API Railway que el mobile.

---

## 2. Scope v1

### Incluido (IN)

- Autenticación coach: login, refresh token, logout, redirect role-gated.
- Dashboard con métricas agregadas + accesos rápidos.
- **Alumnos:** lista, perfil de alumno, monthly report, manejo de solicitudes
  de coaching (accept/reject), quitar coaching.
- **Rutinas:** lista de templates propias del coach, crear, editar, eliminar,
  duplicar, asignar/desasignar a alumnos.
- **Planificaciones:** lista, crear, editar (grid semanas × días), activar /
  desactivar / programar, asignar/desasignar.
- Edición **in-place** de rutinas y plannings del alumno (cuando
  `created_by === coachId` — authorship constraint).
- Theme switcher dark / light (default dark).
- Layout responsive desktop-first hasta tablet (768px). Mobile redirige a la app.

### Excluido (OUT) — explícitamente fuera de v1

- Templates reutilizables ("coach templates" del mobile — `/api/coaching/templates`).
- Training groups.
- Sistema Q&A (coach questions/answers).
- Coach notes privadas.
- Progression rules automáticas.
- Calendar view del coach.
- Premium upgrade / billing.
- Push notifications.
- Sharing flows entre coaches.
- Body measurements.
- Achievements.
- Community / leaderboards.
- Multi-tema (pink/blue/green) — solo dark + light en v1.

Estas features quedan para iteraciones posteriores.

---

## 3. Stack técnico

| Tecnología                | Versión sugerida | Notas                                                          |
|---------------------------|------------------|----------------------------------------------------------------|
| **Next.js**               | 15.x (App Router)| TypeScript strict. SPA — sin SSR en v1 (todo client components). |
| **TypeScript**            | 5.x              | `strict: true`. Path alias `@/`.                               |
| **Tailwind CSS**          | 3.x              | Consume CSS variables. No JIT custom classes.                  |
| **react-hook-form**       | 7.x              | Formularios — igual que mobile.                                |
| **zod**                   | 3.x              | Validación de schemas — igual que mobile.                      |
| **@hookform/resolvers**   | latest           | Adapter zod ↔ react-hook-form.                                 |
| **lucide-react**          | latest           | Iconos — espejo de `lucide-react-native` en mobile.            |
| **fetch nativo**          | —                | HTTP. Sin axios ni librerías de red. Helpers en `lib/api/http.ts`. |
| **next/font**             | built-in         | Cargar SF Pro Display fallback con `-apple-system`.            |

**No usar:**
- shadcn/ui (componentes preconstruidos no matchean con el design system mobile).
- NextAuth.js (overhead innecesario — JWT en localStorage matchea el mobile).
- redux/zustand (React Context alcanza para v1, igual que mobile).
- swr/tanstack-query en v1 (fetch directo en componentes; añadir más tarde si
  hace falta cache global).

---

## 4. Arquitectura de carpetas

```
web/
├── PLANNING.md                  ← este documento
├── README.md                    ← cómo correr el proyecto (Fase 1+)
├── mockups/                     ← HTML/CSS estáticos (Fase 0)
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                   ← NEXT_PUBLIC_API_BASE_URL
├── public/
│   └── favicon.svg
└── src/
    ├── app/                     ← Next.js App Router
    │   ├── layout.tsx           ← root: ThemeProvider, AuthProvider, fonts
    │   ├── page.tsx             ← redirect según auth
    │   ├── (auth)/
    │   │   ├── layout.tsx       ← shell auth (centrado, sin sidebar)
    │   │   └── login/page.tsx
    │   └── (panel)/
    │       ├── layout.tsx       ← shell panel: sidebar + topbar + RequireCoach
    │       ├── page.tsx         ← dashboard
    │       ├── students/
    │       │   ├── page.tsx     ← lista
    │       │   └── [id]/
    │       │       ├── page.tsx                ← perfil + tabs
    │       │       ├── routines/[routineId]/page.tsx
    │       │       └── plannings/[planningId]/page.tsx
    │       ├── routines/
    │       │   ├── page.tsx     ← lista de templates del coach
    │       │   ├── new/page.tsx
    │       │   └── [id]/page.tsx
    │       └── plannings/
    │           ├── page.tsx     ← lista
    │           ├── new/page.tsx
    │           └── [id]/page.tsx
    ├── components/
    │   ├── ui/                  ← Button, Card, Input, Badge, Avatar, Table, Modal, Sidebar, Topbar, ThemeToggle, EmptyState, Skeleton, Pagination, StatCard
    │   ├── students/            ← StudentRow, StudentHeader, StudentTabs
    │   ├── routines/            ← RoutineCard, ExerciseEditor, SetsTable
    │   └── plannings/           ← PlanningCard, PlanningGrid, WeekCell
    ├── lib/
    │   ├── api/
    │   │   ├── config.ts        ← NEXT_PUBLIC_API_BASE_URL, storage keys
    │   │   ├── http.ts          ← httpFetch<T>, refresh interceptor
    │   │   ├── auth.ts          ← login, refresh, me
    │   │   ├── coaching.ts      ← dashboard, students, requests
    │   │   ├── routines.ts      ← own coach routines
    │   │   ├── plannings.ts     ← own coach plannings
    │   │   ├── student-routines.ts   ← /api/coaching/students/:id/routines
    │   │   ├── student-plannings.ts  ← /api/coaching/students/:id/plannings
    │   │   └── types.ts         ← portado 1:1 desde mobile/lib/api/types.ts
    │   ├── utils.ts             ← getErrorMessage, isCoach, formatDate
    │   ├── datetime.ts          ← portado desde mobile/lib/datetime.ts
    │   ├── exercise-presets.ts  ← portado 1:1 (helper espejo de backend)
    │   └── progress-comparison.ts ← portado 1:1 (helper espejo de backend)
    ├── contexts/
    │   ├── AuthContext.tsx      ← user, tokens, login/logout
    │   └── ThemeContext.tsx     ← dark/light + persistencia localStorage
    ├── hooks/
    │   ├── useStudents.ts
    │   ├── useRoutines.ts
    │   └── usePlannings.ts
    ├── styles/
    │   ├── globals.css          ← @tailwind directives + tokens.css inline
    │   └── tokens.css           ← CSS variables (espejo de mobile)
    └── middleware.ts            ← (opcional v1.1) redirect / si no hay token
```

---

## 5. Design system port

### Tokens (CSS variables)

Espejo exacto del archivo `mockups/shared/tokens.css`, que a su vez es espejo de
`mobile/constants/colors.ts` + `mobile/constants/styles.ts`.

Definición en `src/styles/tokens.css`, scoped a `:root` (light) y
`[data-theme="dark"]`. `ThemeContext` cambia el atributo `data-theme` en
`<html>`, todo Tailwind y CSS reacciona.

### Tailwind config

`tailwind.config.ts` mapea las CSS vars a clases utilitarias:

```ts
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-secondary": "var(--bg-secondary)",
        card: "var(--card)",
        "card-elevated": "var(--card-elevated)",
        primary: "var(--primary)",
        success: "var(--success)",
        destructive: "var(--destructive)",
        warning: "var(--warning)",
        accent: "var(--accent)",
        fg: "var(--fg)",
        "fg-secondary": "var(--fg-secondary)",
        "fg-tertiary": "var(--fg-tertiary)",
        border: "var(--border)",
        // ...alphas, day-mon..day-sun, heatmap-0..heatmap-4, etc.
      },
      borderRadius: {
        xs: "6px", sm: "10px", md: "13px", lg: "16px",
        xl: "22px", "2xl": "20px", "3xl": "24px",
        pill: "9999px",
      },
      spacing: {
        xxs: "2px", xs: "4px", sm: "8px", md: "12px",
        lg: "16px", xl: "20px", xxl: "24px", xxxl: "32px",
      },
      fontSize: {
        xxs: "10px", xs: "11px", sm: "12px", md: "13px",
        base: "14px", lg: "16px", xl: "18px", xxl: "24px",
        display: "28px",
      },
      boxShadow: {
        subtle: "var(--shadow-subtle)",
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
      },
    },
  },
};
```

### Tokens completos

Ver `mockups/shared/tokens.css` para el set completo. Resumen de las categorías:

- **Colors:** background (4 layers), card (3 variants), iOS system (primary,
  success, destructive, warning, accent, teal, purple, pink, indigo), foreground
  (4 niveles), separator (3), fills (4), skeleton, on-color, semantic, alphas
  (08/12/16/20/30/40 por color), chart palette (1-5), day badges, heatmap (0-4),
  flame, gradient stops, overlays, sidebar.
- **Spacing:** xxs (2) → xxxl (32) más 4xl/5xl en web.
- **Radius:** xs (6) → 3xl (24) + pill (9999) — **mandatory pill en buttons**.
- **Typography:** xxs (10) → display (28). Weights 400 → 900.
- **Shadows:** subtle / card / elevated / modal.
- **Layout web-only:** `--sidebar-width: 248px`, `--topbar-height: 64px`,
  `--content-max-width: 1280px`.

---

## 6. Auth flow

Réplica del flujo mobile (`mobile/contexts/AuthContext.tsx` + `lib/api/http.ts`),
adaptado a web.

### Storage

- Clave: `growe.web.auth` en `localStorage`.
- Forma: `{ user: User, accessToken: string, refreshToken: string }`.

### Flujo

1. **Boot:** `AuthContext` lee `localStorage`. Si hay tokens, llama
   `GET /api/auth/me` para validar y refrescar `user`.
2. **Login:** `POST /api/auth/login` con `{ email, password }` → guarda tokens y
   user → redirect a `/`.
3. **Role gate:** wrapper `<RequireCoach>` en `(panel)/layout.tsx`:
   - Si no hay `user` → redirect a `/login`.
   - Si `user.role_id !== 2` → mensaje "Solo coaches pueden acceder al panel
     web" + botón logout (limpia tokens y vuelve a `/login`).
4. **HTTP:** `httpFetch<T>()` en `lib/api/http.ts`:
   - Inyecta `Authorization: Bearer ${accessToken}` en cada request.
   - Parsea el envelope `{ success, data, message, error }`.
   - En 401: intenta `POST /api/auth/refresh` con `refreshToken`. Si funciona,
     guarda los nuevos tokens y reintenta el original. Si falla, dispara evento
     `auth:expired` → `AuthContext` hace logout + redirect.
5. **Logout:** limpia `localStorage`, resetea contexto, redirect a `/login`.

### Endpoints auth

- `POST /api/auth/login` → `{ user, accessToken, refreshToken }`
- `POST /api/auth/refresh` → `{ accessToken, refreshToken }`
- `GET /api/auth/me` → `{ user }`
- `POST /api/auth/logout` (opcional — invalida refresh server-side)

---

## 7. Endpoints consumidos (v1)

| Área              | Método / Path                                                                  | Uso                                          |
|-------------------|--------------------------------------------------------------------------------|----------------------------------------------|
| Auth              | `POST /api/auth/login`                                                         | Login                                        |
| Auth              | `POST /api/auth/refresh`                                                       | Refresh                                      |
| Auth              | `GET /api/auth/me`                                                             | Boot / validación role                       |
| Dashboard         | `GET /api/coaching/dashboard`                                                  | Métricas + alumnos recientes                 |
| Dashboard         | `GET /api/coaching/dashboard/metrics`                                          | Métricas agregadas (cards)                   |
| Alumnos           | `GET /api/coaching/students?page=&search=`                                     | Lista paginada                               |
| Alumnos           | `GET /api/users/:id`                                                           | Perfil del alumno                            |
| Alumnos           | `GET /api/coaching/students/:id/monthly-report?month=YYYY-MM`                  | Reporte mensual                              |
| Alumnos           | `GET /api/coaching/students/:id/logs?page=`                                    | Historial de workouts                        |
| Alumnos           | `GET /api/coaching/students/:id/progress/consistency-heatmap`                  | Heatmap de consistencia                      |
| Alumnos           | `GET /api/coaching/students/:id/progress/planning-adherence`                   | Adherencia por semana                        |
| Coaching links    | `GET /api/coaching/requests`                                                   | Solicitudes pendientes                       |
| Coaching links    | `POST /api/coaching/requests/:id/respond`                                      | Aceptar / rechazar                           |
| Coaching links    | `DELETE /api/coaching/:userId`                                                 | Quitar coaching                              |
| Rutinas (coach)   | `GET /api/routines?page=`                                                      | Mis rutinas propias                          |
| Rutinas (coach)   | `POST /api/routines`                                                           | Crear                                        |
| Rutinas (coach)   | `GET /api/routines/:id`                                                        | Detalle                                      |
| Rutinas (coach)   | `PUT /api/routines/:id`                                                        | Editar                                       |
| Rutinas (coach)   | `DELETE /api/routines/:id`                                                     | Eliminar                                     |
| Rutinas (alumno)  | `GET /api/coaching/students/:studentId/routines`                               | Rutinas del alumno                           |
| Rutinas (alumno)  | `GET /api/coaching/students/:studentId/routines/:routineId`                    | Detalle (read si no autor)                   |
| Rutinas (alumno)  | `PUT /api/coaching/students/:studentId/routines/:routineId`                    | Editar in-place (solo si autor)              |
| Plannings (coach) | `GET /api/plannings?page=`                                                     | Mis plannings propias                        |
| Plannings (coach) | `POST /api/plannings`                                                          | Crear                                        |
| Plannings (coach) | `PUT /api/plannings/:id`                                                       | Editar / activar / desactivar                |
| Plannings (coach) | `DELETE /api/plannings/:id`                                                    | Eliminar                                     |
| Plannings (alumno)| `GET /api/coaching/students/:studentId/plannings`                              | Plannings del alumno                         |
| Plannings (alumno)| `GET /api/coaching/students/:studentId/plannings/:planningId`                  | Detalle                                      |
| Plannings (alumno)| `PUT /api/coaching/students/:studentId/plannings/:planningId`                  | Editar in-place (solo si autor)              |
| Plannings (alumno)| `PUT /api/coaching/students/:studentId/plannings/:planningId/current-week`     | Avanzar semana                               |
| Plannings (alumno)| `GET /api/coaching/students/:studentId/plannings/:planningId/weeks/:week/routines/:routineId/exercises` | Ejercicios de la semana    |
| Plannings (alumno)| `PUT /api/coaching/students/:studentId/plannings/:planningId/weeks/:week/routines/:routineId/exercises` | Editar ejercicios de la semana |

---

## 8. Páginas y data fetching

| Página                                           | Endpoints                                          | Componentes clave                              |
|--------------------------------------------------|----------------------------------------------------|------------------------------------------------|
| `/login`                                         | `POST /auth/login`                                 | `AuthCard`, `Input`, `Button`                  |
| `/` (dashboard)                                  | `GET /coaching/dashboard` + `/coaching/requests`   | `StatCard` ×4, `RequestsList`, `RecentStudentsList`, `QuickAccessCards` |
| `/students`                                      | `GET /coaching/students` (paginado)                | `StudentTable`, `Pagination`, `SearchBar`, `FilterChips` |
| `/students/[id]`                                 | `GET /users/:id` + `monthly-report` + `heatmap`    | `StudentHeader`, `Tabs`, `Heatmap`, `RoutinesList`, `PlanningCard` |
| `/students/[id]/routines/[routineId]`            | `GET /coaching/students/:id/routines/:routineId`   | `RoutineEditor`, `SetsTable`                   |
| `/students/[id]/plannings/[planningId]`          | `GET /coaching/students/:id/plannings/:planningId` | `PlanningGrid`, `WeekSelector`                 |
| `/routines`                                      | `GET /routines`                                    | `RoutineCard` grid, `EmptyStateCard`           |
| `/routines/new`                                  | `POST /routines`                                   | `RoutineEditor` (sin ID)                       |
| `/routines/[id]`                                 | `GET /routines/:id` + `PUT`                        | `RoutineEditor`, `AssignedStudentsPanel`       |
| `/plannings`                                     | `GET /plannings`                                   | `PlanningCard` grid                            |
| `/plannings/new`                                 | `POST /plannings`                                  | `PlanningWizard`                               |
| `/plannings/[id]`                                | `GET /plannings/:id` + `PUT`                       | `PlanningGrid`, `WeekSelector`, `RoutineSidePanel` |

**Patrón de fetch (v1):** `useEffect` + `fetch` directo. No SWR. Cada pantalla
maneja su propio `loading` / `error` con `<Skeleton>` y `<ErrorBanner>`.

---

## 9. Componentes UI a portar (v1 mínimo)

Todos en `src/components/ui/`. Espejo conceptual de `mobile/components/ui/`.

- `<Button>` — pill por defecto (`rounded-pill`). Variantes: primary, outline,
  ghost, secondary, danger, success. Sizes: sm (32px), md (44px), lg (52px).
- `<Card>` — bg `var(--card)`, border, radius lg, shadow card. Variantes: default,
  elevated, flat, gradient (ámbar→primary overlay).
- `<Input>` — height 44px, bg `var(--fill-tertiary)`, radius md, focus ring.
- `<Field>` — wrapper label + Input + error message (zod).
- `<Badge>` — pill compacto. Variantes: primary, success, warning, danger, neutral, purple.
- `<Avatar>` — círculo con gradient ámbar→primary + iniciales. Sizes sm/md/lg/xl.
- `<Table>` — header, rows, hover, pagination. Para students list.
- `<StatCard>` — label + value display + delta opcional + icono colored top-right.
- `<Sidebar>` — items con icon + label + active state. Brand top, footer logout.
- `<Topbar>` — title (con breadcrumb), search, theme toggle, avatar.
- `<ThemeToggle>` — switch dark/light, persiste en localStorage.
- `<EmptyState>` — dashed card con icono circular gradiente + título + descripción + CTA.
- `<Skeleton>` — shimmer subtle (alpha 0.04→0.10). Variants: line, circle, box.
- `<Modal>` — overlay + card centered. Wrapper sobre `<dialog>` HTML nativo.
- `<Pagination>` — anterior/siguiente + info "X-Y de Z".
- `<Tabs>` — list de tabs, active subraya con primary.
- `<Chip>` — pill compacto filtrable, active highlight.
- `<DayBadge>` — pill con color por día de la semana (mon..sun).

---

## 10. Tipos compartidos a copiar 1:1

Estos archivos del mobile son framework-agnostic y deben portarse **sin cambios**:

| Origen                                                  | Destino                              |
|---------------------------------------------------------|--------------------------------------|
| `mobile/lib/api/types.ts`                               | `web/src/lib/api/types.ts`           |
| `mobile/lib/utils.ts` (subset: `getErrorMessage`, `isTeacher`, `formatShortDate`) | `web/src/lib/utils.ts` (rename `isTeacher` → `isCoach` opcional) |
| `mobile/lib/datetime.ts` (TZ Buenos Aires)              | `web/src/lib/datetime.ts`            |
| `mobile/lib/exercise-presets.ts`                        | `web/src/lib/exercise-presets.ts`    |
| `mobile/lib/progress-comparison.ts`                     | `web/src/lib/progress-comparison.ts` |
| `mobile/lib/api/auth-events.ts`                         | `web/src/lib/api/auth-events.ts`    |

**Regla MANDATORY:** mantener los helpers espejo (`exercise-presets`,
`progress-comparison`) 1:1 con `backend/src/utils/`. Si se actualiza uno, se
actualizan los tres (backend + mobile + web).

---

## 11. Environment

`.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

Producción (Vercel / Railway):

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.growe.fit/api
```

`src/lib/api/config.ts`:

```ts
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";
export const AUTH_STORAGE_KEY = "growe.web.auth";
```

---

## 12. Reglas heredadas del proyecto (MANDATORY)

Checklist breve. Detalles en `CLAUDE.md` raíz y `mobile/CLAUDE.md`.

- **Forms:** `react-hook-form` + `zod`. Schema inline + `zodResolver`.
- **Errores:** `getErrorMessage(error, defaultMessage)` para extraer mensajes
  user-facing. Backend siempre devuelve `{ success, error: { message } }`.
- **Botones pill:** `rounded-pill` (radius 9999) por defecto. **Excepción:**
  empty state CTAs que usan card dashed + ícono gradiente (ver mockups
  `05-routines-list.html` y `07-plannings-list.html`).
- **Color tokens:** nunca hex hardcoded. Siempre via CSS var (`bg-primary`,
  `text-fg-secondary`, etc.).
- **API Response Contract:**
  - Success: `{ success: true, data: T, message?: string }`
  - Paginated: `{ success: true, data: T[], pagination: { page, per_page, total, total_pages } }`
  - Error: `{ success: false, error: { message: string, details?: [] } }`
- **Authorship constraint (rutinas/plannings de alumno):** los PUT a
  `/api/coaching/students/:id/...` devuelven 403 si `created_by !== coachId`.
  En el web, el botón "Editar" debe ser deshabilitado / oculto cuando el
  recurso fue creado por el alumno u otro coach. Mostrar badge "Read-only".
- **No duplicar `progress-comparison` ni `one-rm-calculator` inline.** Usar
  los helpers espejo.
- **idempotencia de logs:** no aplica al web v1 (no se loggean workouts desde
  el panel). Si en el futuro se agrega, replicar el patrón `client_request_id`.
- **Security validations:** `/login` debe respetar el rate limiting del backend.
  En el form, mostrar mensaje específico si el backend devuelve "demasiados
  intentos".

---

## 13. Roadmap por fases

### Fase 0 — Documentación + mockups (este entregable)

- ✅ Carpeta `web/` creada.
- ✅ `PLANNING.md` (este archivo) escrito.
- ✅ 8 mockups HTML en `web/mockups/` + tokens.css + components.css + README.

### Fase 1 — Scaffold + auth shell

- `npx create-next-app@latest web` con TS, Tailwind, App Router, src dir.
- Tokens + Tailwind config.
- Layout root + ThemeProvider + AuthProvider.
- Página `/login` funcional contra `/api/auth/login`.
- `<RequireCoach>` wrapper + redirects.
- Sidebar + Topbar + ThemeToggle.

### Fase 2 — Alumnos (read-only)

- `/` dashboard con stat cards + alumnos recientes + solicitudes pendientes.
- `/students` lista paginada + búsqueda + filtros chip.
- `/students/[id]` perfil + tabs (Resumen) + heatmap + rutinas/plannings list.
- Aceptar/rechazar solicitudes de coaching.
- Quitar coaching.

### Fase 3 — Rutinas del alumno (edición)

- `/students/[id]/routines/[routineId]` editor in-place.
- Sets table editable (reps/peso/RIR/descanso).
- Validaciones zod.
- Authorship gate (read-only si no es autor).

### Fase 4 — Planificaciones del alumno (edición)

- `/students/[id]/plannings/[planningId]` editor grid semanas × días.
- Selector de semana actual.
- Editar ejercicios de la rutina del día.
- Activar / desactivar / programar planning.

### Fase 5 — Recursos propios del coach

- `/routines` lista + crear + editar + asignar a alumnos.
- `/plannings` lista + crear + editar + asignar a alumnos.

### Fase 6+ — Iteraciones (out of v1 scope, no comprometido)

- Templates coach.
- Training groups.
- Coach notes + Q&A.
- Progression rules.
- Monthly reports descargables (PDF).
- Calendar coach.

---

## 14. Notas y consideraciones

- **Hosting:** Vercel o Railway. Vercel optimizado para Next.js. Railway permite
  monorepo con backend en el mismo proyecto.
- **Dominio:** `app.growe.fit` o `coach.growe.fit` (a definir con producto).
- **Analytics:** no en v1 — agregar Plausible / PostHog en Fase 6+.
- **Sentry / error tracking:** recomendado desde Fase 1.
- **CI:** GitHub Actions con lint + typecheck. Sin tests automatizados en v1
  (la app no tiene DB de test — ver constraint global en `CLAUDE.md`).
- **i18n:** todo en español rioplatense (vos, voseo). No multi-idioma en v1.

---

## 15. Glosario

- **Coach / Profesor (role_id = 2):** usuario que gestiona alumnos.
- **Alumno (role_id = 3):** usuario final que entrena.
- **Coachship:** relación N:1 entre alumnos y un coach. Tiene `status` y
  `is_active`. Coach puede tener hasta `max_students` alumnos activos.
- **Routine:** plantilla de entrenamiento (lista de ejercicios + sets).
- **Planning:** ciclo de N semanas × 7 días donde cada celda referencia una
  Routine.
- **RoutineLog:** instancia ejecutada de una rutina (lo que el alumno hace).
- **Authorship constraint:** un coach solo puede editar rutinas/plannings de
  alumnos cuando él fue quien las creó.
- **Active planning:** la única planning con `status: "active"` por usuario.
  Cambiar de active a otra automáticamente draftea las anteriores.
