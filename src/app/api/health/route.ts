import { healthUseCases } from "@/modules/health/application/health.use-cases";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const result = await healthUseCases.check();
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
