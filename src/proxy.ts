import {
  ACCESS_COOKIE_NAME,
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from "@/lib/auth-cookies";
import { AUTH_USER_ID_HEADER, AUTH_USER_ROLE_HEADER } from "@/lib/api-auth";
import { verifyAccessToken } from "@/lib/jwt";
import { authService } from "@/services/auth.service";
import { errors as joseErrors } from "jose";
import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication (any role)
const AUTH_PAGE_PREFIXES = ["/search", "/favorites"] as const;
const AUTH_API_PREFIXES = [
  "/api/favorites",
  "/api/search-filters",
  "/api/properties/search",
] as const;

// Routes that require SUPERADMIN role
const SUPERADMIN_PAGE_PREFIXES = ["/admin"] as const;
const SUPERADMIN_API_PREFIXES = ["/api/admin", "/api/scraper"] as const;

type RouteKind = "page" | "api";

const matchesPrefix = (pathname: string, prefixes: readonly string[]): boolean =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

type ProtectedRoute =
  | { kind: RouteKind; requiresRole: null }
  | { kind: RouteKind; requiresRole: "SUPERADMIN" };

const classifyRoute = (pathname: string): ProtectedRoute | null => {
  if (matchesPrefix(pathname, SUPERADMIN_API_PREFIXES)) {
    return { kind: "api", requiresRole: "SUPERADMIN" };
  }
  if (matchesPrefix(pathname, SUPERADMIN_PAGE_PREFIXES)) {
    return { kind: "page", requiresRole: "SUPERADMIN" };
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
  const loginUrl = new URL("/login", request.url);
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
  if (status === 403) return NextResponse.redirect(new URL("/search", request.url));
  return redirectToLogin(request, clearSession);
};

const withAuthHeaders = (
  request: NextRequest,
  userId: string,
  role: string,
  tokens?: { accessToken: string; refreshToken: string },
): NextResponse => {
  const headers = new Headers(request.headers);
  headers.set(AUTH_USER_ID_HEADER, userId);
  headers.set(AUTH_USER_ROLE_HEADER, role);
  const response = NextResponse.next({ request: { headers } });
  if (tokens) setAuthCookies(response, tokens);
  return response;
};

const isJwtExpiredError = (error: unknown): boolean =>
  error instanceof joseErrors.JWTExpired ||
  (typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_JWT_EXPIRED");

const refreshSession = async (
  request: NextRequest,
  route: ProtectedRoute,
): Promise<NextResponse | null> => {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return null;

  try {
    const result = await authService.refresh(refreshToken);

    if (route.requiresRole === "SUPERADMIN" && result.user.role !== "SUPERADMIN") {
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

    if (route.requiresRole === "SUPERADMIN" && payload.role !== "SUPERADMIN") {
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
