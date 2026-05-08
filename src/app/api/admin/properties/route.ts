import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const propertyCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().default(""),
  location: z.string().min(1).max(200),
  price: z.number().positive().finite(),
  rooms: z.number().int().min(1).max(50).optional(),
  type: z.enum(["CASA", "APARTAMENTO"]).default("APARTAMENTO"),
  images: z.array(z.string()).default([]),
  ownerId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);
    const properties = await propertiesUseCases.listAdminProperties();
    const data = properties.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      location: p.location,
      price: p.price.toString(),
      type: p.type,
      rooms: p.rooms ?? null,
      images: p.images,
      isScraped: p.isScraped,
      ownerId: p.ownerId,
      owner: p.owner
        ? { id: p.owner.id, name: p.owner.name, email: p.owner.email }
        : null,
      createdAt: p.createdAt.toISOString(),
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
    const payload = propertyCreateSchema.parse(body);
    const created = await propertiesUseCases.createAdminProperty({
      title: payload.title,
      description: payload.description,
      location: payload.location,
      price: payload.price,
      rooms: payload.rooms,
      type: payload.type,
      images: payload.images,
      ownerId: payload.ownerId ?? null,
    });
    return NextResponse.json(
      { data: { ...created, price: created.price.toString() } },
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
