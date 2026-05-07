import { verifyAccessToken } from "@/lib/jwt";
import type { Role } from "@/generated/prisma/enums";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE_NAME = "access_token";
export const AUTH_USER_ID_HEADER = "x-user-id";
export const AUTH_USER_ROLE_HEADER = "x-user-role";
export const AUTH_INTERNAL_SIG_HEADER = "x-auth-sig";

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
  return value === "ADMIN" || value === "EMPLOYEE";
};

const getAuthSignatureSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }

  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }

  return secret;
};

export const createAuthSignature = (userId: string, role: Role): string => {
  return createHmac("sha256", getAuthSignatureSecret())
    .update(`${userId}:${role}`)
    .digest("hex");
};

const isValidAuthSignature = (
  userId: string,
  role: Role,
  providedSignature: string | null | undefined,
): boolean => {
  if (!providedSignature) {
    return false;
  }

  try {
    const expectedSignature = createAuthSignature(userId, role);
    const providedBuffer = Buffer.from(providedSignature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
};

export const resolveAuthenticatedUserFromHeaders = (
  requestHeaders: HeaderReader,
): AuthenticatedRequestUser | null => {
  const userId = requestHeaders.get(AUTH_USER_ID_HEADER);
  const roleValue = requestHeaders.get(AUTH_USER_ROLE_HEADER);
  const signature = requestHeaders.get(AUTH_INTERNAL_SIG_HEADER);

  if (!userId || !isRole(roleValue)) {
    return null;
  }

  if (!isValidAuthSignature(userId, roleValue, signature)) {
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
