import { authUseCases } from "@/modules/auth/application/auth.use-cases";
import { AuthServiceError } from "@/modules/auth/domain/auth.types";
import { setAuthCookies } from "@/lib/auth-cookies";
import { loginSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const payload = loginSchema.parse(body);
    const result = await authUseCases.login(payload);

    const response = NextResponse.json({ user: result.user }, { status: 200 });
    setAuthCookies(response, result.tokens);
    return response;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "El cuerpo JSON es inválido." }, { status: 400 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Error de validación.", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof AuthServiceError && error.code === "INVALID_CREDENTIALS") {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
