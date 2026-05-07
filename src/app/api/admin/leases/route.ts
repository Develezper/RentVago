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

const leaseCreateSchema = z
  .object({
    propertyId: z.string().uuid(),
    tenantId: z.string().uuid(),
    startDate: z.string().date(),
    endDate: z.string().date(),
    monthlyRent: z.number().positive().finite(),
    status: z.enum(["ACTIVO", "PENDIENTE", "EXPIRADO"]).default("PENDIENTE"),
  })
  .strict()
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "La fecha de fin debe ser posterior a la fecha de inicio.",
    path: ["endDate"],
  });

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);
    const leases = await leaseService.getAllLeases();
    const data = leases.map((l) => ({
      id: l.id,
      propertyId: l.propertyId,
      tenantId: l.tenantId,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      monthlyRent: l.monthlyRent.toString(),
      status: l.status,
      createdAt: l.createdAt.toISOString(),
      property: l.property,
      tenant: l.tenant,
    }));
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);
    const body: unknown = await request.json();
    const payload = leaseCreateSchema.parse(body);
    const created = await leaseService.createLease({
      ...payload,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
    });
    return NextResponse.json(
      {
        data: {
          ...created,
          startDate: created.startDate.toISOString(),
          endDate: created.endDate.toISOString(),
          monthlyRent: created.monthlyRent.toString(),
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 },
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
