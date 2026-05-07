import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { searchFilterService } from "@/services/search-filter.service";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const asOptionalString = (value: unknown): unknown => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }
  return value;
};

const toOptionalNumber = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim().length === 0) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
};

const searchFilterIdSchema = z.string().uuid();

const updateSearchFilterSchema = z
  .object({
    query: z.preprocess(asOptionalString, z.string().min(1).max(120).optional()),
    location: z.preprocess(asOptionalString, z.string().min(1).max(120).optional()),
    minPrice: z.preprocess(toOptionalNumber, z.number().positive().finite().optional()),
    maxPrice: z.preprocess(toOptionalNumber, z.number().positive().finite().optional()),
    rooms: z.preprocess(toOptionalNumber, z.number().int().min(1).max(20).optional()),
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.minPrice !== undefined &&
      data.maxPrice !== undefined &&
      data.minPrice > data.maxPrice
    ) {
      context.addIssue({
        code: "custom",
        path: ["minPrice"],
        message: "El precio mínimo no puede ser mayor que el precio máximo.",
      });
    }
  });

const resolveId = async (context: RouteContext): Promise<string> => {
  const { id } = await context.params;
  return searchFilterIdSchema.parse(id);
};

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    const id = await resolveId(context);
    const filter = await searchFilterService.getByIdForUser(authenticatedUser.userId, id);

    if (!filter) {
      return NextResponse.json({ error: "Filtro de búsqueda no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: filter }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "El id del filtro de búsqueda es inválido.", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    const id = await resolveId(context);
    const body: unknown = await request.json();
    const payload = updateSearchFilterSchema.parse(body);
    const updated = await searchFilterService.updateByIdForUser(
      authenticatedUser.userId,
      id,
      payload,
    );

    if (!updated) {
      return NextResponse.json({ error: "Filtro de búsqueda no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: updated }, { status: 200 });
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

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return PATCH(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    const id = await resolveId(context);
    const deleted = await searchFilterService.deleteByIdForUser(authenticatedUser.userId, id);

    if (!deleted) {
      return NextResponse.json({ error: "Filtro de búsqueda no encontrado." }, { status: 404 });
    }

    return NextResponse.json(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "El id del filtro de búsqueda es inválido.", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
