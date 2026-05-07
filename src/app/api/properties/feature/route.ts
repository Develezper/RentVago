import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { FeaturePropertyUseCaseError } from "@/modules/properties/application/feature-property.use-case";
import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const featurePropertySchema = z.object({ propertyId: z.string().uuid() }).strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    const body: unknown = await request.json();
    const payload = featurePropertySchema.parse(body);

    const featured = await propertiesUseCases.featureProperty({
      propertyId: payload.propertyId,
      ownerId: authenticatedUser.userId,
    });

    return NextResponse.json(
      {
        data: {
          order: {
            ...featured.order,
            createdAt: featured.order.createdAt.toISOString(),
            paidAt: featured.order.paidAt?.toISOString() ?? null,
          },
          property: {
            ...featured.property,
            featuredUntil: featured.property.featuredUntil?.toISOString() ?? null,
          },
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return authorizationErrorResponse(error);
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "El cuerpo JSON es invalido." }, { status: 400 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Error de validacion.", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof FeaturePropertyUseCaseError) {
      if (error.code === "PROPERTY_NOT_FOUND") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (error.code === "FORBIDDEN" || error.code === "PROPERTY_NOT_OWNED") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error.code === "INVALID_STATUS") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
