import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type PropertyEmbeddingPrice = number | string | { toString(): string };

const EMBEDDING_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-4o-mini";

export interface Property {
  title: string;
  description: string;
  price: PropertyEmbeddingPrice;
  city: string | null;
  neighborhood: string | null;
  rooms: number | null;
}

export interface PropertyWithId extends Property {
  id: string;
}

export interface SimilarProperty {
  id: string;
  title: string;
  description: string;
  price: string;
  city: string | null;
  neighborhood: string | null;
  rooms: number | null;
  propertyType: string;
  similarity: number;
}

export interface ChatWithAssessorResult {
  reply: string;
  contextProperties: SimilarProperty[];
}

const toPriceString = (price: PropertyEmbeddingPrice): string => {
  if (typeof price === "number") return Number.isFinite(price) ? String(price) : "0";
  if (typeof price === "string") return price;
  return price.toString();
};

const normalizeEmbedding = (embedding: number[]): number[] =>
  embedding.map((value) => (Number.isFinite(value) ? value : 0));

class AIService {
  private readonly client: OpenAI | null;
  private hasWarnedMissingKey = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  private buildPropertyEmbeddingInput(property: Property): string {
    return [
      `titulo: ${property.title}`,
      `descripcion: ${property.description}`,
      `precio_cop: ${toPriceString(property.price)}`,
      `ciudad: ${property.city ?? "sin_ciudad"}`,
      `barrio: ${property.neighborhood ?? "sin_barrio"}`,
      `habitaciones: ${property.rooms ?? "sin_dato"}`,
    ].join("\n");
  }

  private warnMissingKeyOnce(): void {
    if (!this.hasWarnedMissingKey) {
      this.hasWarnedMissingKey = true;
      logger.warn("OPENAI_API_KEY is missing. AI features are running in fallback mode.");
    }
  }

  private buildUserQueryEmbeddingInput(userQuery: string): string {
    return `consulta_usuario: ${userQuery.trim()}`;
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(",")}]`;
  }

  private async generateUserQueryEmbedding(userQuery: string): Promise<number[] | null> {
    if (!this.client) {
      this.warnMissingKeyOnce();
      return null;
    }

    try {
      const response = await this.client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: this.buildUserQueryEmbeddingInput(userQuery),
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding || embedding.length === 0) {
        logger.warn("OpenAI returned an empty embedding for user query.", {
          userQuery,
        });
        return null;
      }

      return normalizeEmbedding(embedding);
    } catch (error: unknown) {
      logger.error("Failed to generate query embedding with OpenAI.", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private formatPropertiesAsContext(properties: SimilarProperty[]): string {
    if (properties.length === 0) {
      return "No se encontraron propiedades en contexto para esta consulta.";
    }

    return properties
      .map(
        (property, index) =>
          [
            `Propiedad ${index + 1}:`,
            `ID: ${property.id}`,
            `Titulo: ${property.title}`,
            `Descripcion: ${property.description}`,
            `Precio COP: ${property.price}`,
            `Ciudad: ${property.city ?? "N/D"}`,
            `Barrio: ${property.neighborhood ?? "N/D"}`,
            `Habitaciones: ${property.rooms ?? "N/D"}`,
            `Tipo: ${property.propertyType}`,
            `Similitud: ${property.similarity.toFixed(4)}`,
          ].join("\n"),
      )
      .join("\n\n");
  }

  private buildFallbackChatReply(properties: SimilarProperty[]): string {
    if (properties.length === 0) {
      return "Parce, por ahora no encontré propiedades que hagan match directo con tu búsqueda. Si quieres, te ayudo a ajustar presupuesto, zona o habitaciones, o te invito a dejar una alerta para avisarte apenas salga algo súper alineado.";
    }

    const suggestions = properties
      .slice(0, 3)
      .map(
        (property) =>
          `${property.title} (${property.city ?? "Sin ciudad"}) por ${property.price} COP`,
      )
      .join("; ");

    return `Parce, te recomiendo estas opciones que hacen buen match: ${suggestions}. Si quieres, te filtro más fino por barrio, habitaciones o presupuesto.`;
  }

  private async searchByKeywordFallback(
    userQuery: string,
    limit: number,
  ): Promise<SimilarProperty[]> {
    const normalizedQuery = userQuery.trim();
    if (normalizedQuery.length === 0) return [];

    type FallbackRow = {
      id: string;
      title: string;
      description: string;
      price: string;
      city: string | null;
      neighborhood: string | null;
      rooms: number | null;
      propertyType: string;
    };

    const rows = await prisma.$queryRaw<FallbackRow[]>`
      SELECT
        "id",
        "title",
        "description",
        "price"::text AS "price",
        "city",
        "neighborhood",
        "rooms",
        "type"::text AS "propertyType"
      FROM "Property"
      WHERE "status" = 'AVAILABLE'::"PropertyStatus"
        AND (
          "title" ILIKE '%' || ${normalizedQuery} || '%'
          OR "description" ILIKE '%' || ${normalizedQuery} || '%'
          OR "city" ILIKE '%' || ${normalizedQuery} || '%'
          OR "neighborhood" ILIKE '%' || ${normalizedQuery} || '%'
        )
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      ...row,
      similarity: 0,
    }));
  }

  async searchSimilarProperties(userQuery: string, limit = 5): Promise<SimilarProperty[]> {
    const normalizedQuery = userQuery.trim();
    if (normalizedQuery.length === 0) return [];

    const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
    const queryEmbedding = await this.generateUserQueryEmbedding(normalizedQuery);

    if (!queryEmbedding) {
      return this.searchByKeywordFallback(normalizedQuery, safeLimit);
    }

    const queryVector = this.toVectorLiteral(queryEmbedding);

    type SimilarPropertyRow = {
      id: string;
      title: string;
      description: string;
      price: string;
      city: string | null;
      neighborhood: string | null;
      rooms: number | null;
      propertyType: string;
      similarity: number;
    };

    const rows = await prisma.$queryRaw<SimilarPropertyRow[]>`
      SELECT
        "id",
        "title",
        "description",
        "price"::text AS "price",
        "city",
        "neighborhood",
        "rooms",
        "type"::text AS "propertyType",
        (1 - ("embedding" <=> ${queryVector}::vector))::double precision AS "similarity"
      FROM "Property"
      WHERE "status" = 'AVAILABLE'::"PropertyStatus"
        AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> ${queryVector}::vector ASC
      LIMIT ${safeLimit}
    `;

    return rows;
  }

  async generatePropertyEmbedding(property: Property): Promise<number[] | null> {
    if (!this.client) {
      this.warnMissingKeyOnce();

      return null;
    }

    try {
      const response = await this.client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: this.buildPropertyEmbeddingInput(property),
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding || embedding.length === 0) {
        logger.warn("OpenAI returned an empty embedding for property.", {
          title: property.title,
          city: property.city,
        });
        return null;
      }

      return normalizeEmbedding(embedding);
    } catch (error: unknown) {
      logger.error("Failed to generate property embedding with OpenAI.", {
        error: error instanceof Error ? error.message : String(error),
        title: property.title,
        city: property.city,
      });
      return null;
    }
  }

  async savePropertyEmbedding(propertyId: string, embedding: number[] | null): Promise<void> {
    if (!embedding || embedding.length === 0) return;

    const vectorLiteral = `[${embedding.join(",")}]`;

    try {
      await prisma.$executeRaw`
        UPDATE "Property"
        SET "embedding" = ${vectorLiteral}::vector
        WHERE "id" = ${propertyId}::uuid
      `;
    } catch (error: unknown) {
      logger.error("Failed to persist property embedding.", {
        error: error instanceof Error ? error.message : String(error),
        propertyId,
      });
    }
  }

  async generateAndPersistPropertyEmbedding(property: PropertyWithId): Promise<void> {
    const embedding = await this.generatePropertyEmbedding(property);
    await this.savePropertyEmbedding(property.id, embedding);
  }

  async chatWithAssessor(userMessage: string): Promise<ChatWithAssessorResult> {
    const normalizedMessage = userMessage.trim();
    if (normalizedMessage.length === 0) {
      return {
        reply:
          "Comparte tu consulta y con gusto te ayudo a encontrar una propiedad ideal en el Valle de Aburra.",
        contextProperties: [],
      };
    }

    const contextProperties = await this.searchSimilarProperties(normalizedMessage, 5);
    const context = this.formatPropertiesAsContext(contextProperties);

    if (!this.client) {
      this.warnMissingKeyOnce();
      return {
        reply: this.buildFallbackChatReply(contextProperties),
        contextProperties,
      };
    }

    const systemPrompt =
      "Eres el Asesor Inmobiliario Estrella de RentVago, experto en el Valle de Aburra (Medellin, Envigado, Itagui, etc.). Usa el siguiente contexto de propiedades disponibles para responder al usuario. Se amable, conciso, usa jerga local muy sutil (parce, super) y si hay propiedades que hacen match, recomiendalas con entusiasmo. Si no hay propiedades exactas en el contexto, sugiere alternativas o invitalo a dejar una alerta. NUNCA inventes propiedades que no esten en el contexto.";

    try {
      const completion = await this.client.chat.completions.create({
        model: CHAT_MODEL,
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\nContexto de propiedades disponibles:\n${context}`,
          },
          {
            role: "user",
            content: normalizedMessage,
          },
        ],
      });

      const reply = completion.choices[0]?.message?.content?.trim();

      if (!reply) {
        return {
          reply: this.buildFallbackChatReply(contextProperties),
          contextProperties,
        };
      }

      return {
        reply,
        contextProperties,
      };
    } catch (error: unknown) {
      logger.error("Failed to generate chat completion for assessor.", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        reply: this.buildFallbackChatReply(contextProperties),
        contextProperties,
      };
    }
  }
}

export const aiService = new AIService();
