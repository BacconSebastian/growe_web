# Growe Web — Panel de Coach

Panel administrativo web para coaches de Growe. Construido con Next.js 15, TypeScript y Tailwind CSS.

## Requisitos

- Node.js 18+
- npm 9+
- Backend Growe corriendo en `http://localhost:3001` (o configurado via `.env.local`)

## Cómo levantar

```bash
# 1. Desde la raíz del proyecto web/
cd web

# 2. Copiar variables de entorno
cp .env.local.example .env.local

# 3. Instalar dependencias
npm install

# 4. Levantar en modo desarrollo
npm run dev
```

La app queda en `http://localhost:3000`.

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | URL base del backend | `http://localhost:3001/api` |

Para producción (Vercel / Railway):
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.growe.fit/api
```

## Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo (hot reload)
npm run build      # Build de producción
npm run start      # Servidor de producción (requiere build previo)
npm run lint       # ESLint
npm run typecheck  # TypeScript sin emitir (solo type-check)
```

## Arquitectura

```
src/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # Root: ThemeProvider + AuthProvider
│   ├── page.tsx          # Redirect según auth
│   ├── (auth)/           # Páginas sin sidebar
│   │   └── login/        # Login funcional
│   └── (panel)/          # Panel del coach (requiere role_id=2)
│       └── page.tsx      # Dashboard (placeholder Fase 1)
├── components/ui/        # Primitivas de UI (Button, Card, Input, etc.)
├── contexts/             # AuthContext + ThemeContext
├── lib/
│   ├── api/              # Layer de API (http.ts, auth.ts, types.ts)
│   ├── utils.ts          # Helpers (getErrorMessage, isCoach, etc.)
│   └── datetime.ts       # Helpers de fecha (TZ Buenos Aires)
└── styles/
    ├── globals.css       # Tailwind + reset
    └── tokens.css        # CSS variables (design tokens)
```

## Autenticación

Solo coaches (`role_id === 2`) pueden acceder al panel.
Tokens guardados en `localStorage` bajo la key `growe.web.auth`.

Flujo:
1. Login → `POST /api/auth/login` → guarda `{ user, accessToken, refreshToken }`.
2. Cada request HTTP inyecta `Authorization: Bearer {accessToken}`.
3. En 401: intenta `POST /api/auth/refresh`. Si falla → logout automático.

## Themes

- Dark (default) y Light.
- El toggle alterna y persiste en `localStorage` bajo `growe.web.theme`.
- El tema se aplica via `document.documentElement.dataset.theme`.

## Troubleshooting

### "Cannot find module 'next'"
```bash
npm install
```

### Build falla con errores de tipos
```bash
npm run typecheck
```

### La app no conecta al backend
Verificá que `NEXT_PUBLIC_API_BASE_URL` en `.env.local` apunte al backend.
El backend debe estar corriendo: `cd ../backend && npm run dev`.

### Sesión expirada al navegar
Es esperado. Al expirar el token, la app redirige automáticamente a `/login`.
