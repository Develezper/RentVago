import { propertiesUseCases } from "@/modules/properties/application/property.use-cases";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
    const limit = Math.min(48, Math.max(1, parseInt(params.get("limit") ?? "12", 10)));
    const query = params.get("query")?.trim() ?? "";
    const city = params.get("city")?.trim() ?? "";
    const minPrice = params.get("minPrice") ? parseFloat(params.get("minPrice")!) : undefined;
    const maxPrice = params.get("maxPrice") ? parseFloat(params.get("maxPrice")!) : undefined;

    const { total, items } = await propertiesUseCases.listPublicProperties({
      page,
      limit,
      query,
      city,
      minPrice,
      maxPrice,
    });

    const data = items.map((p) => ({
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
