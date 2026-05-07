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

const propertyUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    location: z.string().min(1).max(200).optional(),
    price: z.number().positive().finite().optional(),
    rooms: z.number().int().min(1).max(50).nullable().optional(),
    type: z.enum(["CASA", "APARTAMENTO"]).optional(),
    images: z.array(z.string()).optional(),
    ownerId: z.string().uuid().nullable().optional(),
  })
  .strict();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["SUPERADMIN"]);
    const { id } = await params;
    const body: unknown = await request.json();
    const payload = propertyUpdateSchema.parse(body);
    const updated = await prisma.property.update({
      where: { id },
      data: {
        ...payload,
        price: payload.price !== undefined ? payload.price : undefined,
      },
    });
    return NextResponse.json(
      { data: { ...updated, price: updated.price.toString() } },
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
    requireRole(user, ["SUPERADMIN"]);
    const { id } = await params;
    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
