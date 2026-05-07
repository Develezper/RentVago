import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import { scraperUseCases } from "@/modules/admin/application/scraper.use-cases";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const fuenteCreateSchema = z
  .object({
    nombre: z.string().min(1).max(200),
    url: z.string().url(),
    activo: z.boolean().default(true),
  })
  .strict();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);
    const fuentes = await scraperUseCases.listScrapingSources();
    const data = fuentes.map((f) => ({ ...f, creadoEn: f.creadoEn.toISOString() }));
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
    const payload = fuenteCreateSchema.parse(body);
    const created = await scraperUseCases.createScrapingSource(payload);
    return NextResponse.json(
      { data: { ...created, creadoEn: created.creadoEn.toISOString() } },
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
