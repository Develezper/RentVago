import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const fuenteUpdateSchema = z
  .object({
    nombre: z.string().min(1).max(200).optional(),
    url: z.string().url().optional(),
    activo: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.nombre !== undefined || data.url !== undefined || data.activo !== undefined,
    { message: "Se requiere al menos un campo para actualizar." },
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
    const payload = fuenteUpdateSchema.parse(body);
    const updated = await prisma.scrapingFuente.update({ where: { id }, data: payload });
    return NextResponse.json(
      { data: { ...updated, creadoEn: updated.creadoEn.toISOString() } },
      { status: 200 },
    );
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);
    const { id } = await params;
    await prisma.scrapingFuente.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
