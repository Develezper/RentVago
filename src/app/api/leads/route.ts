import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { CreatePropertyLeadUseCase } from "@/modules/leads/application/create-property-lead.use-case";
import { LeadServiceError } from "@/modules/leads/domain/lead.types";
import { leadRepository } from "@/modules/leads/infrastructure/lead.repository";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const createLeadSchema = z.object({ propertyId: z.string().uuid() }).strict();

const createPropertyLeadUseCase = new CreatePropertyLeadUseCase(leadRepository);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    const body: unknown = await request.json();
    const payload = createLeadSchema.parse(body);

    const lead = await createPropertyLeadUseCase.execute({
      propertyId: payload.propertyId,
      userId: authenticatedUser.userId,
    });

    return NextResponse.json(
      {
        data: {
          id: lead.id,
          propertyId: lead.propertyId,
          userId: lead.userId,
          ownerId: lead.ownerId,
          status: lead.status,
          createdAt: lead.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return authorizationErrorResponse(error);
    }

    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json({ error: "El cuerpo de la solicitud es inválido." }, { status: 400 });
    }

    if (error instanceof LeadServiceError) {
      if (error.code === "PROPERTY_NOT_FOUND") {
        return NextResponse.json({ error: "Propiedad no encontrada." }, { status: 404 });
      }

      if (error.code === "PROPERTY_WITHOUT_OWNER") {
        return NextResponse.json(
          { error: "Esta propiedad no tiene un propietario disponible para contacto directo." },
          { status: 409 },
        );
      }

      if (error.code === "CANNOT_CONTACT_OWN_PROPERTY") {
        return NextResponse.json(
          { error: "No puedes generar leads sobre tu propia propiedad." },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
