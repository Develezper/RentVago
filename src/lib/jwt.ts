import { Role as RoleEnum } from "@/generated/prisma/enums";
import type { Role } from "@/generated/prisma/enums";
import { jwtVerify, SignJWT } from "jose";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const JWT_ALGORITHM = "HS256";

const tokenTypes = ["access", "refresh"] as const;
type TokenType = (typeof tokenTypes)[number];

const roleValues = new Set<Role>(Object.values(RoleEnum));

const isTokenType = (value: unknown): value is TokenType => {
  return tokenTypes.some((tokenType) => tokenType === value);
};

const isRole = (value: unknown): value is Role => {
  return typeof value === "string" && roleValues.has(value as Role);
};

const getJwtSecret = (): Uint8Array => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required.");
  }

  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }

  return new TextEncoder().encode(jwtSecret);
};

export interface TokenClaimsInput {
  userId: string;
  role: Role;
  tokenVersion: number;
}

interface BaseVerifiedTokenPayload {
  sub: string;
  role: Role;
  type: TokenType;
  iat?: number;
  exp?: number;
}

export interface VerifiedAccessTokenPayload extends BaseVerifiedTokenPayload {
  type: "access";
}

export interface VerifiedRefreshTokenPayload extends BaseVerifiedTokenPayload {
  type: "refresh";
  tokenVersion: number;
}

interface AccessTokenClaimsInput {
  userId: string;
  role: Role;
}

const signToken = async (
  payload: AccessTokenClaimsInput,
  tokenType: TokenType,
  expiresIn: string,
): Promise<string> => {
  const claims =
    tokenType === "refresh"
      ? {
          role: payload.role,
          tokenVersion: (payload as TokenClaimsInput).tokenVersion,
          type: tokenType,
        }
      : {
          role: payload.role,
          type: tokenType,
        };

  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
};

const verifyToken = async (
  token: string,
  expectedType: TokenType,
): Promise<VerifiedAccessTokenPayload | VerifiedRefreshTokenPayload> => {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Invalid token subject.");
  }

  if (!isRole(payload.role)) {
    throw new Error("Invalid token role.");
  }

  if (!isTokenType(payload.type)) {
    throw new Error("Invalid token type.");
  }

  if (payload.type !== expectedType) {
    throw new Error("Unexpected token type.");
  }

  if (payload.type === "refresh") {
    if (
      typeof payload.tokenVersion !== "number" ||
      !Number.isInteger(payload.tokenVersion)
    ) {
      throw new Error("Invalid token version.");
    }

    return {
      sub: payload.sub,
      role: payload.role,
      tokenVersion: payload.tokenVersion,
      type: payload.type,
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  return {
    sub: payload.sub,
    role: payload.role,
    type: payload.type,
    iat: payload.iat,
    exp: payload.exp,
  };
};

export const signAccessToken = async (
  payload: AccessTokenClaimsInput,
): Promise<string> => {
  return signToken(payload, "access", ACCESS_TOKEN_EXPIRES_IN);
};

export const signRefreshToken = async (
  payload: TokenClaimsInput,
): Promise<string> => {
  return signToken(payload, "refresh", REFRESH_TOKEN_EXPIRES_IN);
};

export const verifyAccessToken = async (
  token: string,
): Promise<VerifiedAccessTokenPayload> => {
  return verifyToken(token, "access") as Promise<VerifiedAccessTokenPayload>;
};

export const verifyRefreshToken = async (
  token: string,
): Promise<VerifiedRefreshTokenPayload> => {
  return verifyToken(token, "refresh") as Promise<VerifiedRefreshTokenPayload>;
};

export const jwtConfig = {
  accessTokenMaxAgeSeconds: ACCESS_TOKEN_MAX_AGE_SECONDS,
  refreshTokenMaxAgeSeconds: REFRESH_TOKEN_MAX_AGE_SECONDS,
};
