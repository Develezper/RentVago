import {
  AuthorizationError,
  authorizationErrorResponse,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import { scraperUseCases } from "@/modules/admin/application/scraper.use-cases";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// Parallel scrapers can run up to ~90 s each; allow enough wall-clock time.
export const maxDuration = 300;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);

    const results = await scraperUseCases.runScrapingAllSources();

    const totals = results.reduce(
      (acc, r) => ({ saved: acc.saved + r.saved, discarded: acc.discarded + r.discarded }),
      { saved: 0, discarded: 0 },
    );

    return NextResponse.json(
      {
        data: {
          sources: results.length,
          totalSaved: totals.saved,
          totalDiscarded: totals.discarded,
          results,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    const message = error instanceof Error ? error.message : "Error interno del servidor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
