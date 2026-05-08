import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { CreateDirectPropertyUseCase } from "@/modules/properties/application/create-direct-property.use-case";
import { propertiesRepository } from "@/modules/properties/infrastructure/property.repository";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    const body: unknown = await request.json();

    const useCase = new CreateDirectPropertyUseCase(propertiesRepository);
    const created = await useCase.execute(body, authenticatedUser.userId);

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "El cuerpo JSON es inválido." }, { status: 400 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Error de validación.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}