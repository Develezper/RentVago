import { aiService } from "@/modules/ai/ai.service";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

export const runtime = "nodejs";

const chatPayloadSchema = z.object({
  message: z.string().min(1).max(4000),
});

const encodeContextPropertiesHeader = (contextProperties: unknown): string => {
  try {
    return encodeURIComponent(JSON.stringify(contextProperties));
  } catch {
    return encodeURIComponent("[]");
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const payload = chatPayloadSchema.parse(body);

    const result = await aiService.chatWithAssessorStream(payload.message);

    return new NextResponse(result.replyStream, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-context-properties": encodeContextPropertiesHeader(result.contextProperties),
      },
    });

  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "El cuerpo JSON es invalido." }, { status: 400 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Error de validacion.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
