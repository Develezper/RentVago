import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import { adminUseCases } from "@/modules/admin/application/admin.use-cases";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const userUpdateSchema = z
  .object({
    role: z.enum(["EMPLOYEE", "ADMIN"]).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => data.role !== undefined || data.isActive !== undefined,
    { message: "Se requiere al menos un campo para actualizar (role o isActive)." },
  );

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);
    const { id } = await params;
    const body: unknown = await request.json();
    const payload = userUpdateSchema.parse(body);

    if (payload.role !== undefined) {
      await adminUseCases.updateUserRole(id, payload.role);
    }
    if (payload.isActive !== undefined) {
      await adminUseCases.toggleUserStatus(id, payload.isActive);
    }

    return NextResponse.json({ data: { updated: true } }, { status: 200 });
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
