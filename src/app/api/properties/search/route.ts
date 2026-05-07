import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { parsePropertySearchQuery } from "@/lib/property-search-query";
import { searchService } from "@/services/search.service";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);

    const params = request.nextUrl.searchParams;
    const filters = parsePropertySearchQuery(params, { defaultPageSize: 12 });
    const results = await searchService.searchProperties(filters);

    return NextResponse.json(
      {
        data: results.data,
        meta: results.meta,
        viewerRole: authenticatedUser.role,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return authorizationErrorResponse(error);
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Parámetros de búsqueda inválidos.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
