import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import { leaseService } from "@/services/lease.service";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const leaseUpdateSchema = z
  .object({
    propertyId: z.string().uuid().optional(),
    tenantId: z.string().uuid().optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    monthlyRent: z.number().positive().finite().optional(),
    status: z.enum(["ACTIVO", "PENDIENTE", "EXPIRADO"]).optional(),
  })
  .strict()
  .refine(
    (d) => Object.keys(d).length > 0,
    { message: "Se requiere al menos un campo para actualizar." },
  )
  .refine(
    (d) => {
      if (d.startDate && d.endDate) {
        return new Date(d.endDate) > new Date(d.startDate);
      }
      return true;
    },
    { message: "La fecha de fin debe ser posterior a la fecha de inicio.", path: ["endDate"] },
  );

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);
    const { id } = await params;
    const lease = await leaseService.getLeaseById(id);
    if (!lease) return NextResponse.json({ error: "Arriendo no encontrado." }, { status: 404 });
    return NextResponse.json(
      {
        data: {
          ...lease,
          startDate: lease.startDate.toISOString(),
          endDate: lease.endDate.toISOString(),
          monthlyRent: lease.monthlyRent.toString(),
          createdAt: lease.createdAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);
    const { id } = await params;
    const body: unknown = await request.json();
    const payload = leaseUpdateSchema.parse(body);
    const updated = await leaseService.updateLease(id, {
      ...payload,
      startDate: payload.startDate ? new Date(payload.startDate) : undefined,
      endDate: payload.endDate ? new Date(payload.endDate) : undefined,
    });
    return NextResponse.json(
      {
        data: {
          ...updated,
          startDate: updated.startDate.toISOString(),
          endDate: updated.endDate.toISOString(),
          monthlyRent: updated.monthlyRent.toString(),
          createdAt: updated.createdAt.toISOString(),
        },
      },
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
    await leaseService.deleteLease(id);
    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
