import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
} from "@/lib/api-auth";
import { adminUseCases } from "@/modules/admin/application/admin.use-cases";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, ["ADMIN"]);
    const users = await adminUseCases.getAllUsers();
    const data = users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
