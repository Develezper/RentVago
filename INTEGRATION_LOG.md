# INTEGRATION LOG — RentVago

> Diario vivo de decisiones, conflictos y deuda técnica. Actualizado al final de cada fase.

---

## Fase 0 — Inventario y Diagnóstico

**Fecha**: 2026-05-06  
**Ejecutado por**: Claude Sonnet 4.6 (solo lectura, sin escribir código)

---

### 1. Estado del Proyecto Base (`RentVago/`)

El proyecto inicial pre-división tiene muy poco contenido útil para la integración:

| Aspecto | Valor |
|---------|-------|
| Package manager | bun@1.3.9 (bun.lock) ✓ |
| Next.js | 16.2.4 ✓ |
| Base de datos | **MySQL + Mongoose** ← INCOMPATIBLE con todos los forks |
| Prisma schema | MySQL, sin auth, sin roles, sin enums |
| Modelos | User (sin auth), Property, Lease, Payment, Notification |
| Auth | No existe |
| Middleware | No existe |
| Frontend | Solo un `page.tsx` con un agente de chat AI (irrelevante) |
| Dependencias únicas | `mongoose`, `zod` |
| Scripts de seed | Configurado (`bun prisma/seed.ts`) |

**Conclusión**: El contenido de `RentVago/` será sobrescrito casi en su totalidad. Se conservan: `bun.lock` (referencia), `package.json` base (nombre, packageManager, ignoreScripts), y la configuración de bun. Todo lo demás viene de los forks.

---

### 2. Tabla de Divergencia por Fork

#### juanpablo/ (Fuente de verdad arquitectural)

| Categoría | Estado |
|-----------|--------|
| Package manager | bun (sin `packageManager` field explícito, tiene `bun.lock`) |
| Next.js | 16.2.4 ✓ |
| Router | App Router ✓ |
| DB | PostgreSQL + PrismaPg adapter ✓ |
| Auth | JWT via `jose` + `bcryptjs`. Cookies httpOnly. tokenVersion en User. |
| Middleware | **No existe** (auth por ruta via `api-auth.ts`) |
| Archivos nuevos vs base | Todo es nuevo (estructura de carpetas, auth completa, search FTS, favorites, PDF) |
| Dependencias únicas | `@prisma/adapter-pg`, `pg`, `bcryptjs`, `jose`, `pdf-lib`, `bun-types` |

**Estructura src/**:
```
src/
├── app/
│   ├── (auth)/login/, register/
│   ├── (dashboard)/search/[id]/, favorites/
│   └── api/auth/, favorites/, properties/search/, search-filters/[id]/
├── components/ui/favorite-button.tsx
├── lib/prisma.ts, jwt.ts, api-auth.ts, auth-cookies.ts, auth-redirect.ts, validators.ts, ...
├── services/auth.service.ts, property.service.ts, search.service.ts, favorite.service.ts, search-filter.service.ts
└── proxy.ts (+ tests bun)
```

**Prisma schema**: 4 modelos (User, Property, SearchFilter, Favorite), enum Role {ADMIN, EMPLOYEE}, UUID ids, tsvector + trigram FTS, 8 migraciones aplicadas.

**API Endpoints**:
- POST `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/register`
- POST `/api/favorites`
- GET `/api/properties/search`, POST `/api/properties/search/pdf`
- GET/POST/DELETE `/api/search-filters`, GET/PUT `/api/search-filters/[id]`

---

#### kevin/ (Fuente de verdad visual y diseño)

| Categoría | Estado |
|-----------|--------|
| Package manager | bun@1.3.9 ✓ |
| Next.js | 16.2.4 ✓ |
| Router | App Router ✓ |
| DB | PostgreSQL + PrismaPg adapter ✓ |
| Auth | JWT via `jose` + `jsonwebtoken` (redundante) + `bcryptjs` |
| Middleware | No existe |
| Dependencias únicas | `recharts`, `lucide-react`, `nuqs`, `mongoose` (innecesario), `apify`/`crawlee`/`cheerio` (innecesarios), `jsonwebtoken` (redundante) |

**Sistema de diseño**:
- Fondo: `bg-gray-950` (#030712) y `bg-black` para cards
- Acento: `text-green-400`/`bg-green-500` (#22c55e)
- Texto: `text-white`, `text-gray-400`, `text-gray-500`
- Cards: `rounded-2xl` / `rounded-3xl`, `border border-gray-800`, `shadow-[0_4px_20px_rgba(0,0,0,0.5)]`
- Botón primario: `bg-green-500 text-black font-extrabold rounded-2xl hover:bg-green-400`
- Inputs: `bg-gray-900 border-gray-800 rounded-2xl focus:ring-green-500`
- Iconos: `lucide-react`

**Estructura src/**:
```
src/
├── app/
│   ├── login/, register/
│   ├── catalog/ (+ Filters.tsx, PropertyCard.tsx)
│   ├── dashboard/ (layout.tsx con sidebar, page.tsx métricas)
│   ├── dashboard/users/
│   ├── dashboard/properties/, properties/new/, properties/[id]/edit/
│   ├── dashboard/leases/, leases/new/, leases/[id]/edit/
│   └── api/auth/, image-proxy/, properties/[id]/, leases/[id]/, users/
├── components/DashboardCharts.tsx, layout/Navbar.tsx
├── lib/db.ts, auth.ts, validations.ts
└── services/admin.service.ts, property.service.ts, lease.service.ts
```

**Prisma schema**: 8 modelos (User, Property, Lease, Payment, Notification, RefreshToken, SearchLog, Embedding), enums UserRole {ADMIN, USER} + PropertyType {CASA, APARTAMENTO} + LeaseStatus {ACTIVO, PENDIENTE, EXPIRADO}, Int ids (autoincrement), extensions: uuid-ossp + vector.

**API Endpoints**:
- POST `/api/auth/login`, `/api/auth/refresh`, `/api/auth/register`
- GET `/api/image-proxy`
- GET/POST `/api/properties`, GET/PUT/DELETE `/api/properties/[id]`
- GET/POST `/api/leases`, GET/PUT/DELETE `/api/leases/[id]`
- GET `/api/users`

---

#### juanjose/ (CRUD de casas)

| Categoría | Estado |
|-----------|--------|
| Package manager | **npm** (package-lock.json) ← VIOLACIÓN, debe eliminarse |
| Nombre del proyecto | `casahub` (no `rentvago`) |
| Next.js | 16.2.4 ✓ |
| Router | App Router ✓ |
| DB | PostgreSQL + PrismaPg adapter ✓ |
| Auth | JWT via `jsonwebtoken` + `bcryptjs`. Cookie: `auth_token` (diferente a los demás) |
| Middleware | **Existe** `src/middleware.ts`, pero usa `jsonwebtoken` y cookie `auth_token` |
| Dependencias problemáticas | `@supabase/supabase-js` (innecesario), `uuid` (innecesario), `jsonwebtoken` (reemplazar con `jose`), `babel-plugin-react-compiler` (experimental), `tsx` |
| Seed | Existe `prisma/seed.ts` y script `db:seed` ← NO INCLUIR |

**Estructura src/**:
```
src/
├── app/
│   ├── (auth)/login/ (con LoginForm.tsx), register/ (con RegisterForm.tsx)
│   ├── dashboard/ (layout.tsx, page.tsx básico)
│   └── api/auth/login/, logout/, me/, refresh/, register/
│   └── api/casas/ (route.ts: GET/POST), casas/[id]/ (route.ts: GET/PUT/DELETE)
│   └── api/upload/ (route.ts: POST)
├── context/AuthContext.tsx
├── lib/prisma.ts, auth.ts, api.ts, image-upload.ts, response.ts, validation.ts
└── types/auth.types.ts, casa.types.ts
```

**Prisma schema**: 3 modelos (User, Casa, RefreshToken), enum Role {ADMIN, AGENT}, UUID ids.  
**Modelo Casa** (mapeo a Property): `titulo→title`, `descripcion→description`, `precio→price`, `imagenUrl→images[]`, `userId→ownerId`.

**API Endpoints (CRUD casas)**:
- GET/POST `/api/casas` — con paginación (page, limit, sort, order) y búsqueda fulltext (search)
- GET/PUT/DELETE `/api/casas/[id]`

**Lógica GET /api/casas**: page/limit/sort/order, búsqueda en titulo+descripcion (insensitive), retorna casas[] + pagination metadata.

---

#### jorge/ (Scraper Apify)

| Categoría | Estado |
|-----------|--------|
| Package manager | **npm** (package-lock.json) ← VIOLACIÓN |
| Nombre del proyecto | `next-class-thompson` |
| Next.js | **16.2.3** (los demás tienen 16.2.4) |
| Router | App Router ✓ |
| DB | PostgreSQL + PrismaPg adapter ✓ |
| Auth | JWT via `jose` + `bcrypt` (no `bcryptjs`) |
| Middleware | **Existe** `src/middleware.ts`, usa Authorization header |
| Dependencias prohibidas | `node-cron` ← VIOLACIÓN (regla 10, sin cron) |
| Dependencias a eliminar | `sweetalert2`, `ts-node`, `dotenv`, `@types/node-cron`, `@types/bcrypt`, `node-cron` |
| Seed | Existe `prisma/seed.ts` ← NO INCLUIR |
| Archivo problemático | `src/lib/cron.ts` ← NO PORTAR |

**Configuración Apify (fuente de verdad para el scraper)**:
- Actor: `apify~facebook-marketplace-scraper`
- Endpoint: `POST https://api.apify.com/v2/acts/apify~facebook-marketplace-scraper/runs`
- Auth: `Authorization: Bearer ${APIFY_TOKEN}`
- Parámetros: `maxItems: 10`, `maxPagesPerUrl: 10`, `getListingDetails: false`, `getAllListingPhotos: true`, `useApifyProxy: true`, `maxTotalChargeUsd: 1.0`
- Polling: GET `/v2/actor-runs/${runId}` cada 8s, máx 15 intentos (2 min timeout)
- Dataset: GET `/v2/datasets/${datasetId}/items?format=json&clean=true&limit=10`
- Campos output: `marketplace_listing_title`, `listingUrl`, `description`, `primary_listing_photo.photo_image_url`, `listing_price.amount`, `listing_price.formatted_amount`
- Upsert por `urlFuente` para evitar duplicados
- HTTP client: `axios`

**Estructura src/**:
```
src/
├── app/
│   ├── (auth)/login/, register/
│   ├── (dashboard)/admin/, arrendamientos/
│   └── api/auth/, agents/create/, arriendos/ (mock), scraping/ejecutar/, scraping/fuentes/[id]/
├── components/ui/LoginForm.tsx, RegisterForm.tsx, Navbar.tsx
├── lib/db.ts, cron.ts (NO PORTAR), hash.ts, jwt.ts
├── services/scraping.ts (PORTAR), loginUser.ts, registerUser.ts
└── types/scraping.ts, user.ts
```

**Prisma schema**: 4 modelos (User, Agent, ScrapingFuente, Arrendamiento), enum Role {ADMIN, USER}, Int ids (autoincrement).

**API Endpoints**:
- POST `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/register`
- POST `/api/scraping/ejecutar` → renombrar a `/api/scraper/run`
- GET `/api/scraping/fuentes` → renombrar a `/api/scraper/sources`
- POST `/api/scraping/fuentes` → renombrar a `/api/scraper/sources`
- GET/PUT `/api/scraping/fuentes/[id]` → renombrar a `/api/scraper/sources/[id]`

---

### 3. Versiones de Next.js y Router

| Fork | Next.js | Router |
|------|---------|--------|
| RentVago/ | 16.2.4 | App Router ✓ |
| juanpablo/ | 16.2.4 | App Router ✓ |
| kevin/ | 16.2.4 | App Router ✓ |
| juanjose/ | 16.2.4 | App Router ✓ |
| jorge/ | **16.2.3** | App Router ✓ |

**Nota**: jorge/ tiene 16.2.3; todos los demás tienen 16.2.4. El proyecto integrado usará 16.2.4. No hay bandera roja de Pages Router — todos usan App Router.

---

### 4. Dependencias Consolidadas (proyecto final)

**Dependencias de producción a incluir:**

| Paquete | Versión | Fuente | Justificación |
|---------|---------|--------|---------------|
| `next` | 16.2.4 | todos | framework |
| `react` / `react-dom` | 19.2.4 | todos | framework |
| `@prisma/adapter-pg` | ^7.8.0 | juanpablo, juanjose | driver PostgreSQL |
| `@prisma/client` | ^7.8.0 | todos | ORM (versión más alta gana) |
| `pg` | ^8.20.0 | todos | driver postgres nativo |
| `bcryptjs` | ^3.0.3 | juanpablo, kevin, juanjose | hash passwords |
| `jose` | ^6.2.3 | juanpablo, kevin, jorge | JWT |
| `zod` | ^4.3.6 | juanpablo, kevin base | validaciones |
| `recharts` | ^3.8.1 | kevin | gráficas dashboard |
| `lucide-react` | ^1.9.0 | kevin | iconos |
| `nuqs` | ^2.8.9 | kevin | URL query state |
| `axios` | ^1.7.7 | jorge | HTTP client Apify |
| `pdf-lib` | ^1.17.1 | juanpablo | export PDF búsquedas |
| `sonner` | ^2.0.7 | juanjose | toast notifications |

**Dependencias de desarrollo a incluir:**

| Paquete | Versión | Fuente |
|---------|---------|--------|
| `prisma` | ^7.8.0 | todos |
| `tailwindcss` | ^4 | todos |
| `@tailwindcss/postcss` | ^4 | todos |
| `typescript` | ^5 | todos |
| `eslint` | ^9 | todos |
| `eslint-config-next` | 16.2.4 | todos |
| `@types/node` | ^20 | todos |
| `@types/react` | ^19 | todos |
| `@types/react-dom` | ^19 | todos |
| `@types/bcryptjs` | ^3.0.0 | kevin, juanjose |
| `@types/pg` | ^8.20.0 | kevin, jorge |
| `bun-types` | ^1.3.13 | juanpablo |

**Dependencias ELIMINADAS (con justificación):**

| Paquete | Encontrado en | Razón de eliminación |
|---------|---------------|----------------------|
| `mongoose` | RentVago/, kevin/ | Proyecto usa PostgreSQL+Prisma, no MongoDB |
| `jsonwebtoken` | kevin/, juanjose/ | Redundante con `jose` (arquitectura juanpablo) |
| `@types/jsonwebtoken` | kevin/, juanjose/ | Idem |
| `node-cron` | jorge/ | Regla 10: sin cron, disparo manual solamente |
| `@types/node-cron` | jorge/ | Idem |
| `apify` | kevin/ | Jorge usa API REST directa via axios, no SDK |
| `crawlee` | kevin/ | No usado en ningún módulo real |
| `cheerio` | kevin/ | No usado en módulo de integración |
| `sweetalert2` | jorge/ | Reemplazar por `sonner` (juanjose) o alerts nativos |
| `bcrypt` | jorge/ | Consolidar a `bcryptjs` (juanpablo) |
| `@types/bcrypt` | jorge/ | Idem |
| `uuid` | juanjose/ | Usar `crypto.randomUUID()` nativo |
| `@supabase/supabase-js` | juanjose/ | Prisma conecta directamente, no se necesita cliente JS |
| `ts-node` | jorge/ | bun ejecuta TypeScript nativamente |
| `tsx` | juanjose/ | bun ejecuta TypeScript nativamente |
| `dotenv` | jorge/ | Next.js carga .env automáticamente |
| `babel-plugin-react-compiler` | juanjose/ | Experimental, innecesario |
| `@prisma/config` | jorge/ | Redundante con `prisma` |
| `npm` | jorge/ (devDep!) | Usar bun |
| `i` | jorge/ (devDep!) | Paquete basura, eliminar |
| `pdf-lib` | juanpablo/ | **DUDA**: ¿mantener para export PDF? → SÍ, es feature existente |

---

### 5. Sistema de Auth de Juanpablo (stack identificado)

**Librería**: `jose` (JWT) + `bcryptjs` (hashing)  
**Tipo**: JWT puro — sin NextAuth, sin Supabase Auth, sin Lucia

**Tokens**:
- Access token: 15 min, cookie `access_token`, `httpOnly: true, secure: true, sameSite: 'strict'`
- Refresh token: 7 días, cookie `refresh_token`, mismas flags
- Algoritmo: HS256
- Claims access: `sub` (userId), `role`, `type: "access"`
- Claims refresh: `sub`, `role`, `type: "refresh"`, `tokenVersion`

**Rotación de tokens**:
- `tokenVersion: Int` en el modelo User (incrementa en logout y refresh)
- No hay tabla RefreshToken en DB (más simple, más seguro)
- En refresh: `updateMany({ where: { id, tokenVersion } })` — si no coincide, token inválido

**Protección de rutas**:
- No hay `middleware.ts` en juanpablo. Cada route handler llama a `requireAuthenticatedUser(request)` o `requireRole(user, [Role.ADMIN])`
- `api-auth.ts`: lee el JWT del cookie o del header `x-user-id`/`x-user-role` (para middleware forward)
- **Para el proyecto integrado**: necesitamos crear `middleware.ts` que proteja `/admin/*` y `/api/admin/*` y `/api/scraper/*`

**Script para promover SUPERADMIN**:
`scripts/promote-user-role.ts` — lee `TARGET_EMAIL` y `TARGET_ROLE` del env, actualiza el rol via Prisma. Portar y adaptar roles.

**Redirect post-auth**: `auth-redirect.ts` — ruta por defecto `/search`, sanitización de `?next=` param.

---

### 6. Configuración Apify de Jorge

Ver sección 2 (jorge/) para detalles completos.

**Notas críticas**:
- El actor opera sobre URLs de Facebook Marketplace; devuelve items con precios en COP (pesos colombianos)
- Las imágenes vienen como URLs de CDN de Facebook: `primary_listing_photo.photo_image_url`
- Upsert por `urlFuente` (campo `listingUrl` del actor) — clave para evitar duplicados
- El modo B (genérico para otras fuentes) es una capa extra que no se debe descartar
- `cron.ts` en jorge/ NO SE PORTA — el disparo es siempre manual (regla 10)
- `ScrapingFuente` model se porta para gestionar las URLs fuente desde el panel admin

---

### 7. Schemas Prisma — Conflictos y Modelo Unificado Propuesto

#### Conflictos de Roles (BLOQUEANTE)

| Fork | Enum | Valores |
|------|------|---------|
| juanpablo | `Role` | ADMIN, EMPLOYEE |
| kevin | `UserRole` | ADMIN, USER |
| juanjose | `Role` | ADMIN, AGENT |
| jorge | `Role` | ADMIN, USER |
| **Reglas de integración** | `Role` | **USER, SUPERADMIN** |

**Decisión**: Usar `Role { USER, SUPERADMIN }` como dictan las reglas. Mapeo:
- ADMIN → SUPERADMIN (todos)
- EMPLOYEE (juanpablo) → USER
- AGENT (juanjose) → USER
- USER (kevin/jorge) → USER

#### Conflictos de ID type

| Fork | User.id | Property.id |
|------|---------|------------|
| juanpablo | UUID | UUID |
| kevin | Int autoincrement | Int autoincrement |
| juanjose | UUID | UUID |
| jorge | Int autoincrement | Int autoincrement |

**Decisión**: UUID gana (juanpablo = fuente de verdad arquitectural). Regla 1.

#### Conflicto imageUrl vs images[]

| Fork | Campo | Tipo |
|------|-------|------|
| juanpablo | `imageUrl` | `String` (requerido) |
| kevin | `imageUrl` | `String?` (opcional) |
| juanjose | `imagenUrl` | `String?` (opcional) |
| jorge | `imagen` (en Arrendamiento) | `String?` |
| **Integración** | `images` | `String[]` (array de URLs) |

**Decisión**: `images String[]` (array vacío por defecto). Regla del prompt: imágenes = solo URLs públicas.

#### Modelo Unificado Propuesto (schema.prisma)

```prisma
enum Role {
  USER
  SUPERADMIN
}

enum PropertyType {
  CASA
  APARTAMENTO
}

enum LeaseStatus {
  ACTIVO
  PENDIENTE
  EXPIRADO
}

model User {
  id            String         @id @default(uuid()) @db.Uuid
  email         String         @unique
  name          String?
  passwordHash  String
  role          Role           @default(USER)
  tokenVersion  Int            @default(0)
  isActive      Boolean        @default(true)
  properties    Property[]
  leases        Lease[]
  searchFilters SearchFilter[]
  favorites     Favorite[]
  notifications Notification[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([role])
}

model Property {
  id           String                   @id @default(uuid()) @db.Uuid
  title        String
  description  String
  images       String[]                 // URLs públicas (Facebook CDN, etc.)
  price        Decimal                  @db.Decimal(12, 2)
  location     String
  rooms        Int?                     // Nullable: propiedades scrapeadas pueden no tenerlo
  type         PropertyType             @default(CASA)
  sourceUrl    String?                  @unique // URL origen scraping (deduplicación)
  isScraped    Boolean                  @default(false)
  ownerId      String?                  @db.Uuid // Nullable: propiedades scrapeadas sin dueño
  owner        User?                    @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  leases       Lease[]
  favorites    Favorite[]
  searchVector Unsupported("tsvector")? @default(dbgenerated()) @map("search_vector")
  createdAt    DateTime                 @default(now())
  updatedAt    DateTime                 @updatedAt

  @@index([ownerId])
  @@index([location])
  @@index([rooms])
  @@index([price])
  @@index([location, rooms, price])
}

model Lease {
  id          String      @id @default(uuid()) @db.Uuid
  startDate   DateTime
  endDate     DateTime
  monthlyRent Decimal     @db.Decimal(10, 2)
  status      LeaseStatus @default(PENDIENTE)
  propertyId  String      @db.Uuid
  property    Property    @relation(fields: [propertyId], references: [id])
  tenantId    String      @db.Uuid
  tenant      User        @relation(fields: [tenantId], references: [id])
  payments    Payment[]
  createdAt   DateTime    @default(now())
}

model Payment {
  id        String   @id @default(uuid()) @db.Uuid
  amount    Decimal  @db.Decimal(10, 2)
  status    String   @default("pending")
  leaseId   String   @db.Uuid
  lease     Lease    @relation(fields: [leaseId], references: [id])
  createdAt DateTime @default(now())
}

model Notification {
  id        String   @id @default(uuid()) @db.Uuid
  message   String
  isRead    Boolean  @default(false)
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}

model SearchFilter {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  query     String?
  minPrice  Decimal? @db.Decimal(12, 2)
  maxPrice  Decimal? @db.Decimal(12, 2)
  location  String?
  rooms     Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([userId, createdAt])
}

model Favorite {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @db.Uuid
  propertyId String   @db.Uuid
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([userId, propertyId])
  @@index([userId])
  @@index([propertyId])
}

model ScrapingFuente {
  id       String   @id @default(uuid()) @db.Uuid
  nombre   String
  url      String   @unique
  activo   Boolean  @default(true)
  creadoEn DateTime @default(now())
}
```

**Modelos DESCARTADOS** (documentados):
- `SearchLog` (kevin): nunca se usa. Deuda técnica sin valor.
- `Embedding` + extensión `vector` (kevin): no forma parte de ningún módulo de integración.
- `RefreshToken` (kevin, juanjose): reemplazado por `tokenVersion` de juanpablo (más limpio).
- `Agent` (jorge): modelo de agentes AI, fuera de scope del proyecto.

---

### 8. Endpoints API — Mapa Completo (rentvago integrado)

#### Auth (public)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

#### Properties (mixed)
- `GET /api/properties` — lista paginada (pública)
- `GET /api/properties/search` — FTS con filtros (autenticado)
- `POST /api/properties/search/pdf` — export PDF (autenticado)
- `GET /api/properties/[id]` — detalle (público)
- `POST /api/properties` — crear (autenticado)
- `PUT /api/properties/[id]` — editar (autenticado, solo dueño o SUPERADMIN)
- `DELETE /api/properties/[id]` — borrar (autenticado, solo dueño o SUPERADMIN)

#### Search Filters (autenticado)
- `GET /api/search-filters`
- `POST /api/search-filters`
- `GET/PUT/DELETE /api/search-filters/[id]`

#### Favorites (autenticado)
- `POST /api/favorites`
- `DELETE /api/favorites` (o `DELETE /api/favorites/[id]`)

#### Admin — solo SUPERADMIN
- `GET /api/admin/users`
- `PUT /api/admin/users/[id]` — cambiar rol o isActive
- `GET/POST /api/admin/leases`
- `GET/PUT/DELETE /api/admin/leases/[id]`

#### Scraper — solo SUPERADMIN
- `POST /api/scraper/run` — ejecutar scraper
- `GET/POST /api/scraper/sources`
- `GET/PUT /api/scraper/sources/[id]`

---

### 9. Variables de Entorno Requeridas

```env
# Supabase PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?schema=public&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?schema=public"

# Auth JWT
JWT_SECRET="your-secret-key-min-32-chars-long"

# Apify Scraper
APIFY_TOKEN="your-apify-api-token"
```

**Notas**:
- `DATABASE_URL`: usa el URL de conexión pooled de Supabase (puerto 6543 con pgbouncer)
- `DIRECT_URL`: URL de conexión directa de Supabase (puerto 5432), requerida para migraciones
- `JWT_SECRET`: mínimo 32 caracteres (requerido por juanpablo/lib/jwt.ts)
- No se necesita `NEXT_PUBLIC_SUPABASE_URL` ni keys de Supabase — Prisma conecta directamente

---

### 10. Cobertura de Frontend

| Vista | juanpablo | kevin | juanjose | jorge | Estado para integración |
|-------|-----------|-------|----------|-------|-------------------------|
| Landing `/` | Básico | ✓ (home) | Básico | Básico | Tomar de kevin, restylar |
| `/login` | ✓ (funcional) | ✓ (DISEÑO REF) | ✓ parcial | ✓ simple | Kevin — fuente de verdad |
| `/register` | ✓ (funcional) | ✓ (DISEÑO REF) | ✓ parcial | ✓ simple | Kevin — fuente de verdad |
| `/catalog` | — | ✓ COMPLETO | — | — | Kevin completo |
| `/catalog/[id]` | — | — | — | — | **CONSTRUIR** con design de kevin |
| `/(dashboard)/search` | ✓ funcional | — | — | — | Portar + restylar con kevin |
| `/(dashboard)/search/[id]` | ✓ parcial | — | — | — | Portar + restylar con kevin |
| `/(dashboard)/favorites` | ✓ funcional | — | — | — | Portar + restylar con kevin |
| `/admin` (métricas) | — | ✓ COMPLETO | — | — | Kevin completo |
| `/admin/users` | — | ✓ COMPLETO | — | — | Kevin completo |
| `/admin/properties` | — | ✓ (con inline styles) | — | — | Kevin + restylar con Tailwind |
| `/admin/properties/new` | — | ✓ parcial | ✓ (form) | — | Merge kevin+juanjose |
| `/admin/properties/[id]/edit` | — | ✓ parcial | ✓ (form) | — | Merge kevin+juanjose |
| `/admin/leases` | — | ✓ COMPLETO | — | — | Kevin completo |
| `/admin/scraper` | — | — | — | ✓ parcial | **CONSTRUIR** con design kevin |

**Vistas a construir desde cero con design system de Kevin**:
1. `/catalog/[id]` — detalle de propiedad pública
2. `/admin/scraper` — panel ejecutar scraper + log de ejecuciones + gestión de fuentes

---

### 11. Conflictos Clasificados

#### BLOQUEANTES (deben resolverse antes de escribir código)

| # | Conflicto | Decisión |
|---|-----------|----------|
| B1 | Roles enum incompatibles (ADMIN/EMPLOYEE vs ADMIN/USER vs ADMIN/AGENT) | **USER + SUPERADMIN** — reglas de integración |
| B2 | ID types: UUID (juanpablo/juanjose) vs Int autoincrement (kevin/jorge) | **UUID** — juanpablo es fuente de verdad arquitectural |
| B3 | `imageUrl String` vs `images String[]` en todos los forks | **`images String[]`** — regla 11, múltiples URLs de scraping |
| B4 | `Property.ownerId` requerido vs propiedades scrapeadas sin dueño | **`ownerId String?` nullable** — scraping no tiene usuario creador |
| B5 | Base RentVago/ usa MySQL + Mongoose | Todo RentVago/ se sobrescribe; se usa PostgreSQL |
| B6 | Auth cookie name: `auth_token` (juanjose) vs `access_token` (juanpablo/kevin) | **`access_token`** — juanpablo es fuente de verdad |
| B7 | Auth library: `jose` vs `jsonwebtoken` vs ambas | **solo `jose`** — juanpablo es fuente de verdad |

#### MEDIOS (se resuelven durante el mergeo)

| # | Conflicto | Decisión |
|---|-----------|----------|
| M1 | juanjose y jorge usan npm | Eliminar `package-lock.json`, migrar a bun |
| M2 | jorge tiene `node-cron` | Eliminar + no portar `cron.ts` |
| M3 | juanjose tiene `seed.ts` | No portar |
| M4 | jorge tiene `Agent` model | No portar (fuera de scope) |
| M5 | kevin tiene `Embedding`/`vector` extension | No portar |
| M6 | juanpablo no tiene `middleware.ts` | **Crear** middleware.ts para `/admin/*` y `/api/admin/*` y `/api/scraper/*` |
| M7 | kevin's dashboard/properties/ usa inline styles | Restylar con Tailwind en Fase 6 |
| M8 | kevin tiene `mongoose` en deps | Eliminar |
| M9 | kevin tiene `apify`/`crawlee`/`cheerio` en deps | Eliminar (jorge usa API REST directa) |
| M10 | `/api/auth/*` duplicado en todos los forks | Única implementación: juanpablo's auth service |

#### COSMÉTICOS

| # | Conflicto | Decisión |
|---|-----------|----------|
| C1 | Naming: `Casa`→`Property`, `titulo`→`title`, `imagenUrl`→`images[]` | Portar con renombrado |
| C2 | Naming: `Arrendamiento`→`Property`, `urlFuente`→`sourceUrl` | Portar con renombrado |
| C3 | `property.address` (kevin) vs `property.location` (juanpablo) | `location` — juanpablo gana |
| C4 | jorge usa `bcrypt` (no `bcryptjs`) | Reemplazar con `bcryptjs` |
| C5 | jorge: Next.js 16.2.3 vs 16.2.4 | Actualizar a 16.2.4 |
| C6 | juanjose: `uuid` package | Reemplazar con `crypto.randomUUID()` |

---

### 12. Estructura de Rutas del Proyecto Integrado

```
src/app/
├── page.tsx                           (landing — de kevin)
├── layout.tsx                         (root — con Navbar de kevin)
├── globals.css                        (dark theme de kevin)
├── (auth)/
│   ├── login/page.tsx                 (de kevin)
│   └── register/page.tsx              (de kevin)
├── catalog/
│   ├── page.tsx                       (de kevin)
│   └── [id]/page.tsx                  (CONSTRUIR con design kevin)
├── (dashboard)/                       (requiere auth USER o SUPERADMIN)
│   ├── layout.tsx
│   ├── search/
│   │   ├── page.tsx                   (de juanpablo, restylar)
│   │   └── [id]/page.tsx              (de juanpablo, restylar)
│   └── favorites/page.tsx             (de juanpablo, restylar)
├── admin/                             (requiere SUPERADMIN)
│   ├── layout.tsx                     (sidebar de kevin)
│   ├── page.tsx                       (métricas de kevin)
│   ├── users/page.tsx                 (de kevin)
│   ├── properties/
│   │   ├── page.tsx                   (de kevin, restylar)
│   │   ├── new/page.tsx               (de kevin + juanjose)
│   │   └── [id]/edit/page.tsx         (de kevin + juanjose)
│   ├── leases/
│   │   ├── page.tsx                   (de kevin)
│   │   ├── new/page.tsx               (de kevin)
│   │   └── [id]/edit/page.tsx         (de kevin)
│   └── scraper/page.tsx               (CONSTRUIR con design kevin)
└── api/
    ├── auth/login/, logout/, refresh/, register/
    ├── properties/, properties/search/, properties/search/pdf/, properties/[id]/
    ├── favorites/
    ├── search-filters/, search-filters/[id]/
    ├── admin/users/, admin/users/[id]/, admin/leases/, admin/leases/[id]/
    └── scraper/run/, scraper/sources/, scraper/sources/[id]/
```

---

### 13. Plan de Integración Propuesto

| Fase | Contenido | Complejidad | Riesgo |
|------|-----------|-------------|--------|
| **Fase 1** | Esqueleto: package.json unificado, tsconfig, next.config, .env.example, CLAUDE.md, `bun install` | Media | Bajo |
| **Fase 2** | Schema Prisma unificado, `bunx prisma generate` | Alta | Medio (reconciliar 4 schemas) |
| **Fase 3** | Auth y middleware (juanpablo) — login, register, middleware.ts | Alta | Bajo (lógica clara) |
| **Fase 4** | CRUD casas (juanjose) + búsquedas/filtros (juanpablo) | Alta | Medio (renombrado de modelos) |
| **Fase 5** | Scraper Apify (jorge) — service + endpoint + UI panel admin | Media | Bajo (lógica completa) |
| **Fase 6** | Panel Superadmin + métricas (kevin) — dashboard, users, leases | Alta | Bajo (diseño completo) |
| **Fase 7** | QA, build, lint, README final | Media | Bajo |

---

## Decisiones Tomadas

| # | Decisión | Justificación | Alternativa descartada |
|---|----------|---------------|------------------------|
| D1 | Roles: USER + SUPERADMIN | Reglas inmutables del prompt | Mantener ADMIN/EMPLOYEE de juanpablo |
| D2 | IDs: UUID en todos los modelos | Juanpablo = fuente de verdad arquitectural | Int autoincrement (kevin) — no elegido |
| D3 | Auth: solo `jose` + `bcryptjs` | Juanpablo = fuente de verdad, `jsonwebtoken` es redundante | jsonwebtoken |
| D4 | Sin tabla RefreshToken | tokenVersion de juanpablo es más simple y seguro | RefreshToken table (kevin/juanjose) |
| D5 | `ownerId` nullable en Property | Propiedades scrapeadas no tienen dueño en el sistema | Sistema user "bot" para scraping |
| D6 | `images String[]` en Property | Regla 11 del prompt, scraping trae múltiples fotos | imageUrl single (todos los forks) |
| D7 | ScrapingFuente → UUID id | Consistencia con resto del schema | Int autoincrement (jorge original) |
| D8 | No incluir `Embedding`/vector extension | Fuera de scope, no hay módulo que lo use | Incluir "por si acaso" |
| D9 | Eliminar `cron.ts` y `node-cron` | Regla 10: sin cron, disparo solo manual | Mantener node-cron |
| D10 | No incluir Agent model (jorge) | Fuera de scope de scraping, no tiene uso en integración | Portarlo como "posible extensión" |

---

---

## Fase 2 — Capa de Datos (Prisma + Supabase)

**Fecha**: 2026-05-06

### Schema unificado creado: `prisma/schema.prisma`

8 modelos definitivos:

| Modelo | Fuente | Cambios vs origen |
|--------|--------|-------------------|
| `User` | juanpablo (base) | + `name?`, `isActive` (kevin); eliminado RefreshToken (tokenVersion reemplaza) |
| `Property` | juanpablo + juanjose + jorge | `imageUrl`→`images String[]`, + `type`, `sourceUrl?`, `isScraped`, `ownerId?` nullable |
| `Lease` | kevin | IDs UUID (Int→UUID), + índices |
| `Payment` | kevin | IDs UUID |
| `Notification` | kevin | IDs UUID, + índices |
| `SearchFilter` | juanpablo | Sin cambios |
| `Favorite` | juanpablo | Sin cambios |
| `ScrapingFuente` | jorge | IDs UUID (Int→UUID) |

**Enums**:
- `Role { USER, SUPERADMIN }` — nuevo (unificación de todos los enums)
- `PropertyType { CASA, APARTAMENTO }` — de kevin
- `LeaseStatus { ACTIVO, PENDIENTE, EXPIRADO }` — de kevin

**Modelos descartados** (documentados en Fase 0):
- `RefreshToken` → reemplazado por `tokenVersion` en User (juanpablo)
- `Agent` (jorge) — fuera de scope
- `SearchLog` (kevin) — no usado
- `Embedding` (kevin) — fuera de scope

### Generación del cliente

```
bunx prisma generate → src/generated/prisma/ ✓
```

Archivos generados: `client.ts`, `enums.ts`, `models.ts`, `browser.ts`, modelos individuales por carpeta.

### Estado de migraciones

**NO se corrieron migraciones contra la DB** — el equipo configura las credenciales (.env).

Para inicializar la DB:
1. Configurar `.env` con `DATABASE_URL` y `DIRECT_URL` de Supabase
2. Habilitar extensiones en Supabase: `unaccent`, `pg_trgm` (para FTS y trigram)
3. `bun run db:migrate` — crea la migración inicial desde el schema unificado
4. Añadir manualmente a esa migración el SQL de juanpablo para:
   - Columna `search_vector` generada con `lower(unaccent(...))`
   - Índice GIN sobre `search_vector`
   - Índice trigram sobre `location`

Los SQL de referencia están en `juanpablo/prisma/migrations/`.

### Verificación

| Check | Resultado |
|-------|-----------|
| `bunx prisma generate` | ✓ Cliente generado en `src/generated/prisma/` |
| Enums correctos | ✓ Role {USER, SUPERADMIN}, PropertyType {CASA, APT}, LeaseStatus |
| Modelos correctos | ✓ 8 modelos, todos con UUID |
| `src/lib/prisma.ts` creado | ✓ Singleton con PrismaPg adapter |
| `bun run build` post-schema | ✓ Sin errores TypeScript |
| `.gitignore` actualizado | ✓ src/generated/ ignorado, .env.example NO ignorado, migraciones NO ignoradas |

---

## Decisiones Pendientes (necesitan input humano)

Ninguna bloqueante antes de iniciar Fase 1. Las decisiones D1–D10 están tomadas con criterio técnico basado en las reglas.

**Pregunta abierta**: ¿Incluir `sonner` (juanjose) para notificaciones toast en el frontend integrado? Es una dependencia liviana con buen UX. Si el equipo prefiere `alert()` nativo o alguna otra solución, indicarlo antes de Fase 4–6.

---

## Deuda Técnica Detectada

| # | Deuda | Origen | Prioridad |
|---|-------|--------|-----------|
| DT1 | `any` implícito en manejo de errores de jorge/scraping.ts (líneas 143-148) | jorge | Baja |
| DT2 | Kevin's admin properties page usa inline styles, no Tailwind | kevin | Media (se resuelve en Fase 6) |
| DT3 | `bcrypt` vs `bcryptjs` en jorge | jorge | Baja (se resuelve en portado) |
| DT4 | juanpablo `lib/auth-redirect.ts` redirige a `/search`, necesita actualizar a rutas integradas | juanpablo | Baja (se resuelve en Fase 3) |
| DT5 | `pdf-lib` (juanpablo) exporta PDFs de búsqueda, funcionalidad no tiene UI en ningún fork | juanpablo | Baja (se puede añadir botón en Fase 4) |

---

---

## Fase 1 — Esqueleto Unificado

**Fecha**: 2026-05-06

### Archivos de configuración creados/actualizados

| Archivo | Acción | Decisión |
|---------|--------|----------|
| `package.json` | Reescrito | 15 deps de producción, 13 devDeps, scripts consolidados, sin seed |
| `tsconfig.json` | Reescrito | Basado en juanpablo: `types: [bun-types, node]`, `allowJs: false`, strict, `exclude: scripts` |
| `next.config.ts` | Reescrito | `serverExternalPackages`, `images.remotePatterns` para dominios externos, `turbopack.root` |
| `prisma.config.ts` | Reescrito | Sin seed, usa `DIRECT_URL ?? DATABASE_URL` para migraciones |
| `.env.example` | Creado | 4 variables: DATABASE_URL, DIRECT_URL, JWT_SECRET, APIFY_TOKEN |
| `CLAUDE.md` | Reescrito | Reglas permanentes, comandos, convenciones, stack |
| `postcss.config.mjs` | Sin cambios | Correcto |
| `eslint.config.mjs` | Sin cambios | Correcto (no-explicit-any: error) |

### Limpieza del proyecto base

Archivos/directorios eliminados de `RentVago/` (incompatibles, fuera de scope):

| Eliminado | Razón |
|-----------|-------|
| `src/agents/` | Sistema AI de chat, fuera de scope |
| `src/models/` | Schemas MongoDB/MySQL, incompatibles |
| `src/lib/` | Conectores MongoDB + MySQL, incompatibles |
| `src/workers/` | Directorio vacío del base |
| `src/components/forms/` | Componente DataInput del chat AI, fuera de scope |
| `src/app/api/` | Ruta del chat AI, fuera de scope |
| `src/app/actions/` | Server actions del base con imports a lib eliminadas |
| `prisma/seed.ts` | Regla 12: sin seeds |
| `test.ts` | Console.log de prueba del base |

### Estructura src/ creada

```
src/
├── app/
│   ├── layout.tsx (skeleton dark theme, sin navbar aún)
│   ├── page.tsx (landing placeholder — se reemplaza en Fase 6)
│   ├── globals.css (dark theme de kevin: bg-gray-950, green-500 accent)
│   ├── favicon.ico (conservado del base)
│   ├── (auth)/login/, register/         (vacíos — Fase 3)
│   ├── (dashboard)/search/, favorites/  (vacíos — Fase 4)
│   ├── admin/ + subrutas                (vacíos — Fase 6)
│   └── api/ + subrutas                  (vacíos — Fases 3-6)
├── components/ui/, layout/              (vacíos — Fases 3-6)
├── lib/                                 (vacío — Fase 3 agrega jwt.ts, api-auth.ts...)
├── services/scraper/                    (vacío — Fase 5)
├── types/                               (vacío)
└── generated/                           (vacío — se llena en Fase 2 con prisma generate)
```

### Verificación

| Check | Resultado |
|-------|-----------|
| `bun install` | ✓ 509 paquetes, sin errores |
| `bun run build` | ✓ Build limpio, 2 rutas estáticas (/, /not-found) |
| `bun run lint` | ✓ Sin errores |

### Decisiones de Fase 1

- `tsconfig.json` excluye `scripts/` (el script `promote-user-role.ts` importa de `@/generated/prisma/` que no existe aún — se habilitará en Fase 2 tras `prisma generate`)
- `src/lib/prisma.ts` no creado aún (se crea en Fase 2 tras generar el cliente)
- La landing page es un placeholder mínimo — se reemplaza en Fase 6 con la de kevin

---

## Dependencias Agregadas

_(ninguna fuera de las ya existentes en los forks — todas las dependencias del package.json consolidado estaban en al menos un fork)_

---

## Vistas Construidas Desde Cero (con design system de Kevin)

_(ninguna aún — actualizar en Fase 5 y 6)_
