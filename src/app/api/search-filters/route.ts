import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { searchFilterService } from "@/services/search-filter.service";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

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

const saveSearchFilterSchema = z
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    const filters = await searchFilterService.listForUser(authenticatedUser.userId);
    return NextResponse.json({ data: filters }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    const body: unknown = await request.json();
    const payload = saveSearchFilterSchema.parse(body);
    const saved = await searchFilterService.createForUser(authenticatedUser.userId, payload);
    return NextResponse.json({ data: saved }, { status: 201 });
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
