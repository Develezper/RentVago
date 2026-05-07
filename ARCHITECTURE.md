# RentVago Architecture

## Overview
RentVago is built with Next.js 16 (App Router), TypeScript strict mode, Prisma + PostgreSQL (Supabase), and Bun.
The codebase follows a modular Clean Architecture under `src/modules`, while `src/app` handles delivery concerns (pages and API controllers).

## Layered Clean Architecture

### Domain Layer
Location: `src/modules/*/domain`

Responsibilities:
- Entities, value objects, service errors, and repository contracts.
- Business language and invariants without framework dependencies.

Examples:
- `src/modules/properties/domain/property.types.ts`
- `src/modules/properties/domain/property.repository.ts`
- `src/modules/properties/domain/search-filter.repository.ts`

Rules:
- No Prisma imports.
- No Next.js imports.
- No external transport concerns (HTTP, cookies, headers).

### Application Layer
Location: `src/modules/*/application`

Responsibilities:
- Use cases orchestrating business flows.
- Input validation and cross-repository coordination.
- Application-level policies (matching, filtering, normalization pipelines).

Examples:
- `src/modules/properties/application/approve-property.use-case.ts`
- `src/modules/properties/application/create-direct-property.use-case.ts`
- `src/modules/properties/application/notify-matching-users.use-case.ts`
- `src/modules/properties/application/upload-property-images.use-case.ts`

Rules:
- Depends on domain contracts.
- May call infrastructure implementations through injected ports.
- Should not contain HTTP response creation.

### Infrastructure Layer
Location: `src/modules/*/infrastructure` and `src/lib`

Responsibilities:
- Prisma repositories and SQL-specific optimization.
- External integrations (Apify scraping, storage URL processing, PDF generation).
- Operational helpers (price normalization, logger, db adapter wiring).

Examples:
- `src/modules/properties/infrastructure/property.repository.ts`
- `src/modules/properties/infrastructure/search-filter.repository.ts`
- `src/modules/properties/infrastructure/price-helper.ts`
- `src/modules/admin/infrastructure/admin.repository.ts`
- `src/lib/prisma.ts`
- `src/lib/logger.ts`

Rules:
- Implements domain repository contracts.
- Encapsulates persistence and external provider details.

## Delivery Layer (Next.js)
Location: `src/app`

Responsibilities:
- Route handlers as thin controllers.
- Input parsing and HTTP status mapping.
- Calling use cases and serializing response DTOs.

Guideline:
- Route handlers must avoid direct DB access and delegate to use cases.

## Security Architecture

### Auth Boundaries
- JWT access and refresh tokens are managed with `jose`.
- Cookies are HTTP-only and validated in proxy and API handlers.
- Authorization is standardized with `AuthorizationError` and `authorizationErrorResponse`.

### HMAC Anti-Spoofing
Files:
- `src/lib/api-auth.ts`
- `src/proxy.ts`

Flow:
1. The proxy authenticates user session.
2. Proxy injects trusted headers: `x-user-id`, `x-user-role`.
3. Proxy signs headers using HMAC SHA-256 as `x-auth-sig`.
4. Route handlers validate signature with timing-safe comparison.
5. Spoofed internal headers are rejected.

Impact:
- Prevents malicious clients from forging identity through headers.

### Single-Flight Refresh Pattern
File: `src/proxy.ts`

A process-local `Map<string, Promise<RefreshResult>>` avoids duplicate refresh-token calls for concurrent requests.

Flow:
1. If access token is expired/missing, proxy attempts refresh.
2. Requests sharing the same refresh token reuse one in-flight promise.
3. Promise is removed after resolution (`finally`).
4. Successful refresh reissues cookies and forwards signed auth headers.

Benefits:
- Reduces race conditions.
- Prevents refresh storms.
- Keeps session behavior deterministic under concurrency.

## Error and HTTP Contract

Standard mapping:
- 400: malformed JSON or validation errors.
- 401: unauthorized (missing/invalid authentication).
- 403: authenticated but forbidden role.
- 404: resource not found (including Prisma `P2025` cases on update/delete by id).
- 500: unexpected server failures.

## Data and Media Principles

- Property images are `string[]` (public URLs only).
- Upload pipeline is centralized by `UploadPropertyImagesUseCase`.
- Price sanitation is centralized by `normalizePositivePriceToNumber`.
- Search includes operational filters such as `verifiedOnly` (`isScraped = false`).

## Operational Scripts

Core scripts (`package.json`):
- `bun run dev`
- `bun run build`
- `bun run lint`
- `bun run lint:fix`
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:push`
- `bun run db:seed`
- `bun run db:reset`

## Team Conventions

- Keep new business logic inside modules and use cases.
- Keep route handlers thin and deterministic.
- Prefer repository interfaces in application code.
- Add explicit not-found handling for id-based mutations.
- Use structured logs through `src/lib/logger.ts` for server observability.
