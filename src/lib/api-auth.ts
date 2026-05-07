import { verifyAccessToken } from "@/lib/jwt";
import type { Role } from "@/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE_NAME = "access_token";
export const AUTH_USER_ID_HEADER = "x-user-id";
export const AUTH_USER_ROLE_HEADER = "x-user-role";

interface HeaderReader {
  get(name: string): string | null | undefined;
}

export interface AuthenticatedRequestUser {
  userId: string;
  role: Role;
}

export class AuthorizationError extends Error {
  public readonly statusCode: 401 | 403;

  constructor(statusCode: 401 | 403, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
  }
}

const isRole = (value: string | null | undefined): value is Role => {
  return value === "USER" || value === "SUPERADMIN";
};

export const resolveAuthenticatedUserFromHeaders = (
  requestHeaders: HeaderReader,
): AuthenticatedRequestUser | null => {
  const userId = requestHeaders.get(AUTH_USER_ID_HEADER);
  const roleValue = requestHeaders.get(AUTH_USER_ROLE_HEADER);

  if (!userId || !isRole(roleValue)) {
    return null;
  }

  return { userId, role: roleValue };
};

export const resolveAuthenticatedUser = async (
  request: NextRequest,
): Promise<AuthenticatedRequestUser | null> => {
  const forwardedUser = resolveAuthenticatedUserFromHeaders(request.headers);

  if (forwardedUser) {
    return forwardedUser;
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(accessToken);
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
};

export const ensureAuthenticatedUser = (
  user: AuthenticatedRequestUser | null,
): AuthenticatedRequestUser => {
  if (!user) {
    throw new AuthorizationError(401, "No autorizado.");
  }
  return user;
};

export const requireAuthenticatedUser = async (
  request: NextRequest,
): Promise<AuthenticatedRequestUser> => {
  const resolved = await resolveAuthenticatedUser(request);
  return ensureAuthenticatedUser(resolved);
};

export const requireRole = (
  user: AuthenticatedRequestUser,
  allowedRoles: readonly Role[],
  errorMessage = "No tienes permisos para realizar esta acción.",
): void => {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError(403, errorMessage);
  }
};

export const authorizationErrorResponse = (
  error: AuthorizationError,
): NextResponse => {
  return NextResponse.json({ error: error.message }, { status: error.statusCode });
};
