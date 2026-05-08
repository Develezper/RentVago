import { prisma } from "@/lib/prisma";
import type { AuthRepository } from "@/modules/auth/domain/auth.repository";
import type {
  AuthTokenUser,
  AuthTokenUserWithPassword,
  RegisterUserData,
} from "@/modules/auth/domain/auth.types";

const userAuthSelect = {
  id: true,
  email: true,
  role: true,
  tokenVersion: true,
} as const;

const userLoginSelect = {
  ...userAuthSelect,
  passwordHash: true,
} as const;

export class PrismaAuthRepository implements AuthRepository {
  async createUser(data: RegisterUserData): Promise<AuthTokenUser> {
    return prisma.user.create({
      data,
      select: userAuthSelect,
    });
  }

  async findUserWithPasswordByEmail(
    email: string,
  ): Promise<AuthTokenUserWithPassword | null> {
    return prisma.user.findUnique({
      where: { email },
      select: userLoginSelect,
    });
  }

  async rotateTokenVersion(userId: string, tokenVersion: number): Promise<boolean> {
    const result = await prisma.user.updateMany({
      where: { id: userId, tokenVersion },
      data: { tokenVersion: { increment: 1 } },
    });

    return result.count === 1;
  }

  async findAuthUserById(userId: string): Promise<AuthTokenUser | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: userAuthSelect,
    });
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await prisma.user.updateMany({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async findUserEmailById(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    return user?.email ?? null;
  }
}

export const authRepository: AuthRepository = new PrismaAuthRepository();
