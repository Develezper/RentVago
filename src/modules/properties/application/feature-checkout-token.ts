import { randomUUID } from "node:crypto";
import { errors as joseErrors, jwtVerify, SignJWT } from "jose";

const FEATURE_CHECKOUT_TOKEN_TYPE = "feature_checkout";
const FEATURE_CHECKOUT_TOKEN_ISSUER = "rentvago";
const FEATURE_CHECKOUT_TOKEN_AUDIENCE = "rentvago:feature-property-checkout";
const FEATURE_CHECKOUT_TOKEN_EXPIRES_IN = "15m";
const FEATURE_CHECKOUT_ALGORITHM = "HS256";

const getFeatureCheckoutSecret = (): Uint8Array => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required.");
  }

  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }

  return new TextEncoder().encode(jwtSecret);
};

export interface CreateFeatureCheckoutTokenInput {
  propertyId: string;
  ownerId: string;
  amount: number;
}

interface VerifyFeatureCheckoutTokenInput {
  token: string;
  expectedPropertyId: string;
  expectedOwnerId: string;
  expectedAmount: number;
}

export interface VerifiedFeatureCheckoutToken {
  checkoutTokenId: string;
  propertyId: string;
  ownerId: string;
  amount: number;
}

export class FeatureCheckoutTokenError extends Error {
  constructor(
    public readonly code: "TOKEN_EXPIRED" | "TOKEN_INVALID" | "TOKEN_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "FeatureCheckoutTokenError";
  }
}

export const createFeatureCheckoutToken = async (
  input: CreateFeatureCheckoutTokenInput,
): Promise<string> => {
  return new SignJWT({
    type: FEATURE_CHECKOUT_TOKEN_TYPE,
    propertyId: input.propertyId,
    amount: input.amount,
  })
    .setProtectedHeader({ alg: FEATURE_CHECKOUT_ALGORITHM, typ: "JWT" })
    .setIssuer(FEATURE_CHECKOUT_TOKEN_ISSUER)
    .setAudience(FEATURE_CHECKOUT_TOKEN_AUDIENCE)
    .setSubject(input.ownerId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(FEATURE_CHECKOUT_TOKEN_EXPIRES_IN)
    .sign(getFeatureCheckoutSecret());
};

export const verifyFeatureCheckoutToken = async (
  input: VerifyFeatureCheckoutTokenInput,
): Promise<VerifiedFeatureCheckoutToken> => {
  try {
    const { payload } = await jwtVerify(input.token, getFeatureCheckoutSecret(), {
      algorithms: [FEATURE_CHECKOUT_ALGORITHM],
      issuer: FEATURE_CHECKOUT_TOKEN_ISSUER,
      audience: FEATURE_CHECKOUT_TOKEN_AUDIENCE,
    });

    const tokenType = payload.type;
    const propertyId = payload.propertyId;
    const ownerId = payload.sub;
    const amount = payload.amount;
    const checkoutTokenId = payload.jti;

    if (
      tokenType !== FEATURE_CHECKOUT_TOKEN_TYPE ||
      typeof propertyId !== "string" ||
      typeof ownerId !== "string" ||
      typeof amount !== "number" ||
      typeof checkoutTokenId !== "string"
    ) {
      throw new FeatureCheckoutTokenError(
        "TOKEN_INVALID",
        "Token de checkout invalido.",
      );
    }

    if (
      propertyId !== input.expectedPropertyId ||
      ownerId !== input.expectedOwnerId ||
      amount !== input.expectedAmount
    ) {
      throw new FeatureCheckoutTokenError(
        "TOKEN_MISMATCH",
        "El token no coincide con el checkout solicitado.",
      );
    }

    return {
      checkoutTokenId,
      propertyId,
      ownerId,
      amount,
    };
  } catch (error: unknown) {
    if (error instanceof FeatureCheckoutTokenError) {
      throw error;
    }

    if (error instanceof joseErrors.JWTExpired) {
      throw new FeatureCheckoutTokenError(
        "TOKEN_EXPIRED",
        "La sesion de checkout expiro. Recarga la pagina e intenta de nuevo.",
      );
    }

    throw new FeatureCheckoutTokenError(
      "TOKEN_INVALID",
      "No pudimos validar la sesion de checkout.",
    );
  }
};
