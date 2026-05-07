import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
    const limit = Math.min(48, Math.max(1, parseInt(params.get("limit") ?? "12", 10)));
    const query = params.get("query")?.trim() ?? "";
    const minPrice = params.get("minPrice") ? parseFloat(params.get("minPrice")!) : undefined;
    const maxPrice = params.get("maxPrice") ? parseFloat(params.get("maxPrice")!) : undefined;

    const where = {
      AND: [
        query.length > 0
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" as const } },
                { location: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {},
        minPrice !== undefined && !isNaN(minPrice) ? { price: { gte: minPrice } } : {},
        maxPrice !== undefined && !isNaN(maxPrice) ? { price: { lte: maxPrice } } : {},
      ],
    };

    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          images: true,
          price: true,
          location: true,
          rooms: true,
          type: true,
        },
      }),
    ]);

    const data = properties.map((p) => ({
      ...p,
      price: p.price.toString(),
      imageUrl: p.images[0] ?? "",
    }));

    return NextResponse.json(
      {
        data,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
