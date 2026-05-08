import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import {
  ApprovePropertyUseCase,
  PropertyNotFoundError,
} from "@/modules/properties/application/approve-property.use-case";
import { NotifyMatchingUsersUseCase } from "@/modules/properties/application/notify-matching-users.use-case";
import { propertiesRepository } from "@/modules/properties/infrastructure/property.repository";
import { searchFilterRepository } from "@/modules/properties/infrastructure/search-filter.repository";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN", "EMPLOYEE"]);

    const { id } = await params;
    const notifyMatchingUsersUseCase = new NotifyMatchingUsersUseCase(searchFilterRepository);
    const useCase = new ApprovePropertyUseCase(
      propertiesRepository,
      notifyMatchingUsersUseCase,
    );
    const updated = await useCase.execute(id);

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return authorizationErrorResponse(error);
    }

    if (error instanceof PropertyNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
