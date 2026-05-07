import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        images: true,
        price: true,
        location: true,
        rooms: true,
        type: true,
        isScraped: true,
        createdAt: true,
        owner: { select: { id: true, name: true } },
      },
    });

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
