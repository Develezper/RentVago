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

const runSchema = z
  .object({
    url: z.string().url().optional(),
  })
  .strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const payload = runSchema.parse(body);

    if (payload.url) {
      const result = await scraperUseCases.runScraping(payload.url);
      return NextResponse.json({ data: [{ source: payload.url, ...result }] }, { status: 200 });
    }

    const results = await scraperUseCases.runScrapingAllSources();
    return NextResponse.json({ data: results }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Error de validación.", issues: error.issues },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Error interno del servidor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
