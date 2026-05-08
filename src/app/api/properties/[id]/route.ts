import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const property = await propertiesUseCases.getPublicPropertyById(id);

    if (!property) {
      return NextResponse.json({ error: "Propiedad no encontrada." }, { status: 404 });
    }

    return NextResponse.json(
      {
        data: {
          ...property,
          price: property.price.toString(),
          createdAt: property.createdAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
