# RentVago — Reglas permanentes del proyecto

## Comandos

```bash
bun install          # instalar dependencias
bun run dev          # servidor de desarrollo
bun run build        # build de producción
bun run lint         # linting ESLint
bun run db:generate  # generar cliente Prisma (bunx prisma generate)
bun run db:migrate   # aplicar migraciones (bunx prisma migrate dev)
bun run db:push      # push schema sin migraciones (dev rápido)
bun run user:promote # promover rol de usuario (TARGET_EMAIL=x TARGET_ROLE=SUPERADMIN)
```

## Stack

- **Next.js 16** (App Router) + TypeScript estricto
- **Bun** — package manager y runtime. NUNCA usar npm o yarn.
- **Prisma ORM** + **PrismaPg adapter** sobre **Supabase (PostgreSQL)**
- **Tailwind CSS v4** (sin tailwind.config.ts, via @import)
- **Recharts** para métricas del dashboard
- **Apify** (`apify~facebook-marketplace-scraper`) para scraping

## Estructura de carpetas

```
src/
├── app/
│   ├── (auth)/           # login, register — públicos
│   ├── (dashboard)/      # search, favorites — requiere auth (USER o SUPERADMIN)
│   ├── admin/            # panel superadmin — requiere SUPERADMIN
│   ├── catalog/          # catálogo público de propiedades
│   └── api/              # route handlers
│       ├── auth/
│       ├── properties/
│       ├── favorites/
│       ├── search-filters/
│       ├── admin/        # endpoints admin (solo SUPERADMIN)
│       └── scraper/      # endpoints scraper (solo SUPERADMIN)
├── components/
│   ├── ui/               # componentes reutilizables (botones, cards, inputs)
│   └── layout/           # Navbar, DashboardSidebar
├── lib/                  # utilidades puras (jwt, auth, prisma client, validadores)
├── services/             # lógica de dominio (auth, property, search, scraper...)
├── generated/            # cliente Prisma auto-generado (NO editar manualmente)
└── types/                # tipos TypeScript compartidos
```

## Convenciones de naming (fuente: juanpablo)

- Archivos: `kebab-case.ts` para lib/services, `PascalCase.tsx` para componentes
- Servicios: `[dominio].service.ts`
- Helpers de lib: `[nombre].ts`
- Route handlers: `route.ts` dentro de cada carpeta de la API
- Tipos compartidos: `[dominio].types.ts`

## Reglas inmutables

### Base de datos
- Un solo `prisma/schema.prisma`. Nunca editar los archivos en `src/generated/`.
- Mantener TODOS los índices de juanpablo en Property y SearchFilter.
- Las imágenes de propiedades son `images String[]` — solo URLs públicas, nunca archivos locales.
- NO crear seeds de datos. El equipo crea SUPERADMINs manualmente via `user:promote`.

### Auth
- JWT via `jose` + `bcryptjs`. NO usar `jsonwebtoken` ni `next-auth` ni Supabase Auth.
- Cookies: `access_token` (15min) y `refresh_token` (7d), httpOnly + secure + sameSite=strict.
- Rotación de tokens via `tokenVersion` en el modelo User (no tabla RefreshToken).
- Secret: `JWT_SECRET` del .env, mínimo 32 caracteres.

### Scraper
- El scraper de Apify se dispara SOLO desde:
  1. `POST /api/scraper/run` (endpoint protegido, solo SUPERADMIN)
  2. Botón en `/admin/scraper` (panel admin)
- NUNCA usar cron jobs ni auto-trigger.
- Las URLs de imágenes de Facebook CDN se guardan tal cual en `images[]`. No descargar.

### Diseño (fuente: kevin)
- Tema oscuro: `bg-gray-950` fondo, `bg-black` cards, `green-500` acento.
- Botón primario: `bg-green-500 text-black font-extrabold rounded-2xl hover:bg-green-400`.
- Cards: `bg-black rounded-2xl border border-gray-800`.
- Inputs: `bg-gray-900 border-gray-800 rounded-2xl focus:ring-green-500`.
- Iconos: `lucide-react`.
- NO mezclar dos sistemas visuales. Todo sigue el diseño de kevin.

### TypeScript
- `strict: true`. Prohibido usar `any` salvo código ya existente documentado como deuda técnica.
- `allowJs: false`. Solo TypeScript.

### Carpetas fuente (SOLO LECTURA)
- `kevin/`, `juanjose/`, `juanpablo/`, `jorge/` son inmutables. Nunca escribir en ellas.

## Roles

```typescript
enum Role {
  USER       // usuario registrado estándar
  SUPERADMIN // acceso total al panel admin
}
```

## Variables de entorno requeridas

Ver `.env.example` para descripción completa.

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL (pooled, puerto 6543) |
| `DIRECT_URL` | Supabase PostgreSQL (directo, puerto 5432, para migraciones) |
| `JWT_SECRET` | Clave JWT, mínimo 32 caracteres |
| `APIFY_TOKEN` | Token de API de Apify |
