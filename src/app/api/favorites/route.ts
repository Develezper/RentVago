import {
  authorizationErrorResponse,
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { favoriteService, FavoriteServiceError } from "@/services/favorite.service";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const toggleFavoriteSchema = z.object({ propertyId: z.string().uuid() }).strict();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    const favorites = await favoriteService.getUserFavorites(authenticatedUser.userId);

    const serialized = favorites.map((fav) => ({
      id: fav.id,
      propertyId: fav.propertyId,
      property: {
        id: fav.property.id,
        title: fav.property.title,
        description: fav.property.description,
        imageUrl: fav.property.images[0] ?? "",
        location: fav.property.location,
        price: fav.property.price.toString(),
        rooms: fav.property.rooms ?? 0,
      },
    }));

    return NextResponse.json({ data: serialized }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return authorizationErrorResponse(error);
    }
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authenticatedUser = await requireAuthenticatedUser(request);
    const body: unknown = await request.json();
    const payload = toggleFavoriteSchema.parse(body);
    const result = await favoriteService.toggleFavorite(
      authenticatedUser.userId,
      payload.propertyId,
    );
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return authorizationErrorResponse(error);
    }

    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json({ error: "El cuerpo de la solicitud es inválido." }, { status: 400 });
    }

    if (error instanceof FavoriteServiceError && error.code === "PROPERTY_NOT_FOUND") {
      return NextResponse.json({ error: "Propiedad no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
