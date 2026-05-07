import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import { adminUseCases } from "@/modules/admin/application/admin.use-cases";
import { runFacebookScraper } from "@/modules/admin/infrastructure/apify-facebook.service";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const runSchema = z
  .object({
    sourceName: z.literal("Facebook"),
    city: z.string().trim().min(1, "La ciudad es obligatoria."),
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
    const scrapedData = await runFacebookScraper(payload.city);
    const { saved } = await adminUseCases.upsertScrapedProperties(scrapedData);

    return NextResponse.json(
      {
        data: {
          sourceName: payload.sourceName,
          city: payload.city,
          fetched: scrapedData.length,
          saved,
        },
      },
      { status: 200 },
    );
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
