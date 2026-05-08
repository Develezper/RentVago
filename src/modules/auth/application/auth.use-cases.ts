import { Role as RoleEnum } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import {
  verifyAccessToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/jwt";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validators";
import type { AuthRepository } from "@/modules/auth/domain/auth.repository";
import {
  AuthServiceError,
  type AuthResult,
  type AuthTokenUser,
  type AuthTokens,
  type AuthUser,
} from "@/modules/auth/domain/auth.types";
import { authRepository } from "@/modules/auth/infrastructure/auth.repository";
import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 12;

interface LogoutInput {
  accessToken?: string;
  refreshToken?: string;
}

const mapToAuthUser = (user: AuthTokenUser): AuthUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

const issueTokens = async (user: AuthTokenUser): Promise<AuthTokens> => {
  const tokenPayload = {
    userId: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken(tokenPayload),
  ]);

  return { accessToken, refreshToken };
};

const invalidCredentialsError = (): AuthServiceError =>
  new AuthServiceError("INVALID_CREDENTIALS", "Invalid email or password.", 401);

const invalidRefreshTokenError = (): AuthServiceError =>
  new AuthServiceError("INVALID_REFRESH_TOKEN", "Invalid refresh token.", 401);

const resolveLogoutUserId = async ({
  accessToken,
  refreshToken,
}: LogoutInput): Promise<string | null> => {
  if (refreshToken && refreshToken.trim().length > 0) {
    try {
      const payload = await verifyRefreshToken(refreshToken);
      return payload.sub;
    } catch {
      // Fallback to access token validation.
    }
  }

  if (accessToken && accessToken.trim().length > 0) {
    try {
      const payload = await verifyAccessToken(accessToken);
      return payload.sub;
    } catch {
      return null;
    }
  }

  return null;
};

const createAuthUseCases = (repository: AuthRepository) => {
  const register = async (input: RegisterInput): Promise<AuthResult> => {
    const payload = registerSchema.parse(input);
    const passwordHash = await bcrypt.hash(payload.password, BCRYPT_SALT_ROUNDS);

    try {
      const createdUser = await repository.createUser({
        email: payload.email,
        passwordHash,
        name: payload.name,
        role: RoleEnum.EMPLOYEE,
      });

      const tokens = await issueTokens(createdUser);

      return { user: mapToAuthUser(createdUser), tokens };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AuthServiceError(
          "EMAIL_ALREADY_IN_USE",
          "A user with this email already exists.",
          409,
        );
      }

      throw error;
    }
  };

  const login = async (input: LoginInput): Promise<AuthResult> => {
    const payload = loginSchema.parse(input);

    const user = await repository.findUserWithPasswordByEmail(payload.email);

    if (!user) {
      throw invalidCredentialsError();
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

    if (!isPasswordValid) {
      throw invalidCredentialsError();
    }

    const tokens = await issueTokens(user);

    return { user: mapToAuthUser(user), tokens };
  };

  const refresh = async (refreshToken: string): Promise<AuthResult> => {
    if (refreshToken.trim().length === 0) {
      throw invalidRefreshTokenError();
    }

    let verifiedPayload: Awaited<ReturnType<typeof verifyRefreshToken>>;

    try {
      verifiedPayload = await verifyRefreshToken(refreshToken);
    } catch {
      throw invalidRefreshTokenError();
    }

    const hasRotated = await repository.rotateTokenVersion(
      verifiedPayload.sub,
      verifiedPayload.tokenVersion,
    );

    if (!hasRotated) {
      throw invalidRefreshTokenError();
    }

    const rotatedUser = await repository.findAuthUserById(verifiedPayload.sub);

    if (!rotatedUser) {
      throw invalidRefreshTokenError();
    }

    const tokens = await issueTokens(rotatedUser);

    return { user: mapToAuthUser(rotatedUser), tokens };
  };

  const logout = async ({ accessToken, refreshToken }: LogoutInput): Promise<void> => {
    const userId = await resolveLogoutUserId({ accessToken, refreshToken });

    if (!userId) {
      return;
    }

    await repository.incrementTokenVersion(userId);
  };

  const getUserEmailById = (userId: string): Promise<string | null> => {
    return repository.findUserEmailById(userId);
  };

  return {
    register,
    login,
    refresh,
    logout,
    getUserEmailById,
  };
};

export const authUseCases = createAuthUseCases(authRepository);
