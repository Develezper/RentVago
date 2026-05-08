import type { Role } from "@/generated/prisma/enums";

export type AuthErrorCode =
  | "EMAIL_ALREADY_IN_USE"
  | "INVALID_CREDENTIALS"
  | "INVALID_REFRESH_TOKEN";

export class AuthServiceError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: 401 | 409;

  constructor(
    code: AuthErrorCode,
    message: string,
    statusCode: 401 | 409 = 401,
  ) {
    super(message);
    this.name = "AuthServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthTokenUser extends AuthUser {
  tokenVersion: number;
}

export interface AuthTokenUserWithPassword extends AuthTokenUser {
  passwordHash: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterUserData {
  email: string;
  name?: string;
  passwordHash: string;
  role: Role;
}
