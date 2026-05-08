import type {
  AuthTokenUser,
  AuthTokenUserWithPassword,
  RegisterUserData,
} from "./auth.types";

export interface AuthRepository {
  createUser(data: RegisterUserData): Promise<AuthTokenUser>;
  findUserWithPasswordByEmail(email: string): Promise<AuthTokenUserWithPassword | null>;
  rotateTokenVersion(userId: string, tokenVersion: number): Promise<boolean>;
  findAuthUserById(userId: string): Promise<AuthTokenUser | null>;
  incrementTokenVersion(userId: string): Promise<void>;
  findUserEmailById(userId: string): Promise<string | null>;
}
