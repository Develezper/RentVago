import { authUseCases } from "@/modules/auth/application/auth.use-cases";
import { AuthServiceError } from "@/modules/auth/domain/auth.types";
import { setAuthCookies } from "@/lib/auth-cookies";
import { registerSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const payload = registerSchema.parse(body);
    const result = await authUseCases.register(payload);

    const response = NextResponse.json({ user: result.user }, { status: 201 });
    setAuthCookies(response, result.tokens);
    return response;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "El cuerpo JSON es inválido." }, { status: 400 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Error de validación.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof AuthServiceError) {
      if (error.code === "EMAIL_ALREADY_IN_USE") {
        return NextResponse.json(
          { error: "Ya existe un usuario con este correo electrónico." },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
