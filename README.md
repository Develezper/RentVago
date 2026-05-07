# RentVago

Marketplace de arriendos con foco en publicación directa, moderación administrativa y búsqueda avanzada.

Stack principal:
- Next.js 16 (App Router)
- TypeScript estricto
- Prisma + PostgreSQL (Supabase)
- Bun (runtime y package manager)
- Tailwind CSS v4

## Comandos

Instalación:
- `bun install`

Desarrollo y calidad:
- `bun run dev`
- `bun run build`
- `bun run lint`
- `bun run lint:fix`

Base de datos:
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:push`
- `bun run db:seed`
- `bun run db:reset`

Utilidades:
- `bun run user:promote` (usa `TARGET_EMAIL` y `TARGET_ROLE=ADMIN|EMPLOYEE`)

## Arquitectura

La documentación técnica detallada está en:
- [ARCHITECTURE.md](ARCHITECTURE.md)

Incluye:
- Clean Architecture modular por capas (Domain, Application, Infrastructure)
- Contratos y reglas de dependencia
- Seguridad con HMAC anti-spoofing
- Patrón Single-Flight para refresh de sesión en proxy
- Estándares de manejo de errores HTTP

## Entorno

Usa `.env` o `.env.local` con al menos:
- `DATABASE_URL` y/o `DIRECT_URL`
- `JWT_SECRET` (mínimo 32 caracteres)

## Docker

- `docker compose up -d`
- `docker compose down`