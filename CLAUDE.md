# RentVago — Reglas Permanentes del Proyecto (Modo Agente)

## Comandos
```bash
bun install          # instalar dependencias
bun run dev          # servidor de desarrollo
bun run build        # build de producción
bun run lint         # linting ESLint
bun run db:generate  # generar cliente Prisma (bunx prisma generate)
bun run db:migrate   # aplicar migraciones (bunx prisma migrate dev)
bun run db:push      # push schema sin migraciones (dev rápido)
bun run user:promote # promover rol de usuario (TARGET_EMAIL=x TARGET_ROLE=ADMIN)
```

## Stack Tecnológico
- **Framework:** Next.js 16 (App Router) + TypeScript estricto.
- **Entorno:** Bun — package manager y runtime. NUNCA usar npm o yarn.
- **Base de Datos:** Prisma ORM + PrismaPg adapter sobre Supabase (PostgreSQL).
- **Estilos:** Tailwind CSS v4 (sin tailwind.config.ts, via @import).
- **Métricas:** Recharts para el dashboard.
- **Scraping:** Apify (`apify~facebook-marketplace-scraper`).

## Estructura de Carpetas (Arquitectura Modular por Capas)
Queda estrictamente prohibido usar Route Handlers masivos o acoplar base de datos en la UI.
```text
src/
├── app/                  # Capa de Presentación (Rutas Next.js)
│   ├── (auth)/           # login, register — públicos
│   ├── (dashboard)/      # UI panel interno — requiere auth
│   ├── catalog/          # catálogo público de propiedades
│   └── api/              # Route handlers (Solo actúan como Controladores, llaman a Casos de Uso)
├── modules/              # Capa de Dominio e Infraestructura (Clean Architecture)
│   ├── [nombre_modulo]/  # ej: properties, auth, users, scraping
│   │   ├── domain/       # Entidades, Enums, Interfaces de repositorios (Sin Prisma)
│   │   ├── application/  # Casos de uso (Lógica de negocio pura)
│   │   └── infrastructure/# Repositorios (Prisma), adaptadores Apify
├── components/           # Componentes UI (Diseño de kevin)
├── lib/                  # Utilidades transversales (jwt, validadores)
└── types/                # Tipos globales
```

## Reglas de Negocio: Roles
El sistema opera EXCLUSIVAMENTE con dos roles. Prohibido usar "USER" o "SUPERADMIN".
```typescript
enum Role {
  ADMIN      // Administrador general del sistema
  EMPLOYEE   // Empleado con accesos limitados a gestión operativa
}
```

## Reglas Inmutables

### Base de datos e Indexación
- Un solo `prisma/schema.prisma`. 
- Todo modelo que participe en búsquedas frecuentes debe tener índices compuestos o B-Tree (`@@index`).
- Las imágenes de propiedades son `images String[]` — solo URLs públicas, nunca archivos locales.

### Autenticación y Seguridad
- JWT via `jose` + `bcryptjs`. NO usar `jsonwebtoken`, `next-auth` ni Supabase Auth.
- Cookies: `access_token` (15min) y `refresh_token` (7d), httpOnly + secure + sameSite=strict.
- El proxy debe incluir protección Anti-Spoofing verificando la firma interna (`x-auth-sig`) en los headers.
- Rotación de tokens via `tokenVersion` en el modelo User, aplicando patrón *Single-Flight* en concurrencia.

### Scraper (Transición a Marketplace)
- El scraper de Apify se dispara SOLO manualmente desde endpoints protegidos. NUNCA cron jobs.
- La data raspada entra con estado `isScraped: true` para diferenciarla de las propiedades publicadas directamente por dueños legales.
- Configurar `APIFY_API_TOKEN` en `.env` para autorizar llamadas al actor `apify~facebook-marketplace-scraper`.

### Diseño Visual (Estilo Kevin)
- Tema oscuro: `bg-gray-950` fondo, `bg-black` cards, `green-500` acento.
- Botones: `bg-green-500 text-black font-extrabold rounded-2xl hover:bg-green-400`.
- Cards/Inputs: Bordes `border-gray-800`, bordes redondeados `rounded-2xl`.
- Iconos: `lucide-react`.

### TypeScript y Código
- `strict: true`. Prohibido usar `any`.
- Los Route Handlers en `src/app/api` NO deben importar `prisma` directamente. Deben instanciar un Caso de Uso del directorio `src/modules`.
