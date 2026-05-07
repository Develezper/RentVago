import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import { parsePropertySearchQuery } from "@/lib/property-search-query";
import { buildPropertySearchPdf } from "@/lib/property-search-pdf";
import { prisma } from "@/lib/prisma";
import { searchService } from "@/services/search.service";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    requireRole(authenticatedUser, ["SUPERADMIN"], "No tienes permisos para descargar este reporte.");

    const params = request.nextUrl.searchParams;
    const filters = parsePropertySearchQuery(params, { defaultPageSize: 50 });
    const results = await searchService.searchProperties(filters);

    const user = await prisma.user.findUnique({
      where: { id: authenticatedUser.userId },
      select: { email: true },
    });

    const pdfBytes = await buildPropertySearchPdf({
      userLabel: user?.email ?? authenticatedUser.userId,
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
