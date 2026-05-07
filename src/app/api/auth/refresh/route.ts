import { authService, AuthServiceError } from "@/services/auth.service";
import {
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from "@/lib/auth-cookies";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: "Falta el token de refresco." }, { status: 401 });
    }

    const result = await authService.refresh(refreshToken);
    const response = NextResponse.json({ user: result.user }, { status: 200 });
    setAuthCookies(response, result.tokens);
    return response;
  } catch (error: unknown) {
    if (
      error instanceof AuthServiceError &&
      error.code === "INVALID_REFRESH_TOKEN"
    ) {
      const response = NextResponse.json(
        { error: "El token de refresco es inválido." },
        { status: 401 },
      );
      clearAuthCookies(response);
      return response;
    }

    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
