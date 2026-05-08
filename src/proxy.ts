import {
  ACCESS_COOKIE_NAME,
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from "@/lib/auth-cookies";
import {
  AUTH_INTERNAL_SIG_HEADER,
  AUTH_USER_ID_HEADER,
  AUTH_USER_ROLE_HEADER,
  createAuthSignature,
} from "@/lib/api-auth";
import type { Role } from "@/generated/prisma/enums";
import { verifyAccessToken, verifyRefreshToken } from "@/lib/jwt";
import { createRequestUrl } from "@/lib/request-origin";
import { authUseCases } from "@/modules/auth/application/auth.use-cases";
import { errors as joseErrors } from "jose";
import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication (any role)
const AUTH_PAGE_PREFIXES = ["/search", "/favorites", "/my-properties", "/checkout"] as const;
const AUTH_API_PREFIXES = [
  "/api/favorites",
  "/api/search-filters",
  "/api/properties/search",
  "/api/properties/direct",
  "/api/properties/feature",
] as const;

// Routes that require ADMIN role
const ADMIN_PAGE_PREFIXES = ["/admin"] as const;
const ADMIN_API_PREFIXES = ["/api/admin", "/api/scraper"] as const;

type RouteKind = "page" | "api";

const matchesPrefix = (pathname: string, prefixes: readonly string[]): boolean =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

type ProtectedRoute =
  | { kind: RouteKind; requiresRole: null }
  | { kind: RouteKind; requiresRole: "ADMIN" };

const classifyRoute = (pathname: string): ProtectedRoute | null => {
  if (matchesPrefix(pathname, ADMIN_API_PREFIXES)) {
    return { kind: "api", requiresRole: "ADMIN" };
  }
  if (matchesPrefix(pathname, ADMIN_PAGE_PREFIXES)) {
    return { kind: "page", requiresRole: "ADMIN" };
  }
  if (matchesPrefix(pathname, AUTH_API_PREFIXES)) {
    return { kind: "api", requiresRole: null };
  }
  if (matchesPrefix(pathname, AUTH_PAGE_PREFIXES)) {
    return { kind: "page", requiresRole: null };
  }
  return null;
};

const redirectToLogin = (request: NextRequest, clearSession = false): NextResponse => {
  const loginUrl = createRequestUrl(request, "/login");
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  const response = NextResponse.redirect(loginUrl);
  if (clearSession) clearAuthCookies(response);
  return response;
};

const unauthorizedApiResponse = (
  message: string,
  status: 401 | 403,
  clearSession = false,
): NextResponse => {
  const response = NextResponse.json({ error: message }, { status });
  if (clearSession) clearAuthCookies(response);
  return response;
};

const rejectRequest = (
  request: NextRequest,
  route: ProtectedRoute,
  status: 401 | 403,
  clearSession = false,
): NextResponse => {
  const message = status === 403 ? "Acceso denegado." : "No autorizado.";
  if (route.kind === "api") return unauthorizedApiResponse(message, status, clearSession);
  if (status === 403) return NextResponse.redirect(createRequestUrl(request, "/search"));
  return redirectToLogin(request, clearSession);
};

const withAuthHeaders = (
  request: NextRequest,
  userId: string,
  role: Role,
  tokens?: { accessToken: string; refreshToken: string },
): NextResponse => {
  const headers = new Headers(request.headers);
  headers.set(AUTH_USER_ID_HEADER, userId);
  headers.set(AUTH_USER_ROLE_HEADER, role);
  headers.set(AUTH_INTERNAL_SIG_HEADER, createAuthSignature(userId, role));
  const response = NextResponse.next({ request: { headers } });
  if (tokens) setAuthCookies(response, tokens);
  return response;
};

const inFlightRefresh = new Map<
  string,
  Promise<Awaited<ReturnType<typeof authUseCases.refresh>>>
>();

const getOrCreateRefreshPromise = (
  refreshToken: string,
): Promise<Awaited<ReturnType<typeof authUseCases.refresh>>> => {
  const currentPromise = inFlightRefresh.get(refreshToken);

  if (currentPromise) {
    return currentPromise;
  }

  const refreshPromise = authUseCases
    .refresh(refreshToken)
    .finally(() => inFlightRefresh.delete(refreshToken));

  inFlightRefresh.set(refreshToken, refreshPromise);
  return refreshPromise;
};

const isJwtExpiredError = (error: unknown): boolean =>
  error instanceof joseErrors.JWTExpired ||
  (typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_JWT_EXPIRED");

type AdminRefreshGuardResult = "allow" | "forbidden" | "unauthorized";

const evaluateAdminRefreshToken = async (
  refreshToken: string,
): Promise<AdminRefreshGuardResult> => {
  try {
    const payload = await verifyRefreshToken(refreshToken);
    return payload.role === "ADMIN" ? "allow" : "forbidden";
  } catch {
    return "unauthorized";
  }
};

const refreshSession = async (
  request: NextRequest,
  route: ProtectedRoute,
): Promise<NextResponse | null> => {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return null;

  if (route.requiresRole === "ADMIN") {
    const adminRefreshGuard = await evaluateAdminRefreshToken(refreshToken);

    if (adminRefreshGuard === "forbidden") {
      return rejectRequest(request, route, 403, false);
    }

    if (adminRefreshGuard === "unauthorized") {
      return rejectRequest(request, route, 401, true);
    }
  }

  try {
    const result = await getOrCreateRefreshPromise(refreshToken);

    if (route.requiresRole === "ADMIN" && result.user.role !== "ADMIN") {
      return rejectRequest(request, route, 403, false);
    }

    return withAuthHeaders(request, result.user.id, result.user.role, result.tokens);
  } catch {
    return rejectRequest(request, route, 401, true);
  }
};

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const route = classifyRoute(pathname);

  if (!route) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    const refreshed = await refreshSession(request, route);
    return refreshed ?? rejectRequest(request, route, 401);
  }

  try {
    const payload = await verifyAccessToken(accessToken);

    if (route.requiresRole === "ADMIN" && payload.role !== "ADMIN") {
      return rejectRequest(request, route, 403);
    }

    return withAuthHeaders(request, payload.sub, payload.role);
  } catch (error: unknown) {
    if (isJwtExpiredError(error)) {
      const refreshed = await refreshSession(request, route);
      return refreshed ?? rejectRequest(request, route, 401, true);
    }
    return rejectRequest(request, route, 401, true);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|login(?:/|$)|register(?:/|$)|catalog(?:/|$)|api/auth(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$).*)",
  ],
};
