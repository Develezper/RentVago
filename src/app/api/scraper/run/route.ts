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
export const maxDuration = 90;

const scrapedPropertySchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    price: z.coerce.number().positive(),
    location: z.string().trim().min(1),
    city: z.string().trim().min(1).optional(),
    neighborhood: z.string().trim().min(1).optional(),
    rooms: z.coerce.number().int().positive().optional(),
    imageUrls: z.array(z.string().trim().url()).optional(),
    imageUrl: z.string().trim().url().optional(),
    sourceUrl: z.string().trim().min(1),
  })
  .strict();

const runSchema = z
  .object({
    sourceName: z.literal("Facebook"),
    city: z.string().trim().min(1, "La ciudad es obligatoria."),
    limit: z.coerce
      .number()
      .int("El límite debe ser un número entero.")
      .min(1, "El límite mínimo es 1.")
      .max(50, "El límite máximo es 50.")
      .default(10),
    preview: z.boolean().default(false),
    properties: z.array(scrapedPropertySchema).max(50).optional(),
  })
  .strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    // Solo ADMIN: alineado con proxy (ADMIN_API_PREFIXES) y política de scraping manual.
    requireRole(user, ["ADMIN"]);

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const payload = runSchema.parse(body);
    const scrapedData =
      payload.properties && !payload.preview
        ? payload.properties
        : await scraperUseCases.previewFacebookScraping(payload.city, payload.limit);
    const saveResult = payload.preview
      ? { saved: 0, discarded: 0 }
      : await scraperUseCases.saveScrapedProperties(scrapedData);

    return NextResponse.json(
      {
        data: {
          sourceName: payload.sourceName,
          city: payload.city,
          limit: payload.limit,
          preview: payload.preview,
          fetched: scrapedData.length,
          saved: saveResult.saved,
          discarded: saveResult.discarded,
          properties: scrapedData,
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
