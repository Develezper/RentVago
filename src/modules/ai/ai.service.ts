import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type PropertyEmbeddingPrice = number | string | { toString(): string };

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

  async generatePropertyEmbedding(property: Property): Promise<number[] | null> {
    if (!this.client) {
      if (!this.hasWarnedMissingKey) {
        this.hasWarnedMissingKey = true;
        logger.warn("OPENAI_API_KEY is missing. Property embeddings generation is disabled.");
      }

      return null;
    }

    try {
      const response = await this.client.embeddings.create({
        model: "text-embedding-3-small",
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
}

export const aiService = new AIService();
