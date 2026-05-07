import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import { parsePropertySearchQuery } from "@/lib/property-search-query";
import { buildPropertySearchPdf } from "@/lib/property-search-pdf";
import { authUseCases } from "@/modules/auth/application/auth.use-cases";
import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    requireRole(authenticatedUser, ["ADMIN"], "No tienes permisos para descargar este reporte.");

    const params = request.nextUrl.searchParams;
    const filters = parsePropertySearchQuery(params, { defaultPageSize: 50 });
    const results = await propertiesUseCases.searchProperties(filters);
    const userEmail = await authUseCases.getUserEmailById(authenticatedUser.userId);

    const pdfBytes = await buildPropertySearchPdf({
      userLabel: userEmail ?? authenticatedUser.userId,
      filters,
      results,
    });

    const fileDate = new Date().toISOString().slice(0, 10);

    return new Response(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reporte-busqueda-${fileDate}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
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
