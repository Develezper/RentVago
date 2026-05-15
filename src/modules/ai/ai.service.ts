import OpenAI from "openai";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { resolveCityByInput } from "@/modules/properties/domain/geography";

type PropertyEmbeddingPrice = number | string | { toString(): string };

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-2.5-flash";
const CREATE_MATCH_ALERT_TOOL_NAME = "create_match_alert";
const SEARCH_CATALOG_TOOL_NAME = "search_catalog";
const QUERY_PUBLIC_PROPERTIES_TOOL_NAME = "query_public_properties";
const MAX_TOOL_CALL_ROUNDS = 3;
const MAX_AI_SQL_LENGTH = 2000;
const MAX_AI_SQL_ROWS = 50;
const MIN_AI_PROPERTY_PRICE_COP = 100000;

const MATCH_ALERT_TOOL = {
  type: "function" as const,
  function: {
    name: CREATE_MATCH_ALERT_TOOL_NAME,
    description:
      "Crea una alerta de match cuando el usuario no encontro una propiedad exacta y comparte nombre, telefono/WhatsApp y criterio de busqueda.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Nombre del cliente.",
        },
        phone: {
          type: "string",
          description: "Numero de WhatsApp o telefono del cliente.",
        },
        criteria: {
          type: "string",
          description: "Criterio de lo que esta buscando el cliente.",
        },
      },
      required: ["name", "phone", "criteria"],
      additionalProperties: false,
    },
  },
};

const SEARCH_CATALOG_TOOL = {
  type: "function" as const,
  function: {
    name: SEARCH_CATALOG_TOOL_NAME,
    description:
      "Util para cuando el usuario pide la propiedad mas barata, mas cara, o busca por una ciudad y presupuesto exacto.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "Ciudad objetivo para filtrar el catalogo (ej: Medellin, Envigado).",
        },
        maxPrice: {
          type: "number",
          description: "Precio maximo en COP.",
        },
        minPrice: {
          type: "number",
          description: "Precio minimo en COP.",
        },
        sortBy: {
          type: "string",
          enum: ["price_asc", "price_desc", "recent"],
          description: "Orden del resultado: menor precio, mayor precio o mas recientes.",
        },
      },
      additionalProperties: false,
    },
  },
};

const QUERY_PUBLIC_PROPERTIES_TOOL = {
  type: "function" as const,
  function: {
    name: QUERY_PUBLIC_PROPERTIES_TOOL_NAME,
    description:
      "Ejecuta una consulta SQL SELECT segura sobre la vista virtual public_properties para responder preguntas exactas o analiticas del catalogo disponible.",
    parameters: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description:
            "Consulta SQL SELECT contra public_properties. Columnas: id, title, description, price, location, city, neighborhood, rooms, type, is_scraped, is_featured, created_at. No uses tablas reales. No filtres por type cuando el usuario diga casa, apartamento, apto, hogar o arriendo.",
        },
      },
      required: ["sql"],
      additionalProperties: false,
    },
  },
};

interface MatchAlertToolArgs {
  name: string;
  phone: string;
  criteria: string;
}

type SearchCatalogSortBy = "price_asc" | "price_desc" | "recent";

interface SearchCatalogToolArgs {
  city?: string;
  maxPrice?: number;
  minPrice?: number;
  sortBy?: SearchCatalogSortBy;
}

interface QueryPublicPropertiesToolArgs {
  sql: string;
}

interface ValidatedPublicPropertiesSql {
  sql: string;
}

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

export interface ChatWithAssessorStreamResult {
  replyStream: ReadableStream<Uint8Array>;
  contextProperties: SimilarProperty[];
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
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
    const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL: GEMINI_BASE_URL,
        })
      : null;
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
      logger.warn(
        "GEMINI_API_KEY/GOOGLE_API_KEY is missing. AI features are running in fallback mode.",
      );
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
        logger.warn("Gemini returned an empty embedding for user query.", {
          userQuery,
        });
        return null;
      }

      return normalizeEmbedding(embedding);
    } catch (error: unknown) {
      logger.error("Failed to generate query embedding with Gemini.", {
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
      return "Por ahora no encontre propiedades que hagan match directo con tu busqueda. Si quieres, te ayudo a ajustar presupuesto, zona o habitaciones, o puedo crear una alerta para avisarte apenas salga algo alineado.";
    }

    const suggestions = properties
      .slice(0, 3)
      .map(
        (property) =>
          `${property.title} (${property.city ?? "Sin ciudad"}) por ${property.price} COP`,
      )
      .join("; ");

    return `Te recomiendo estas opciones que hacen buen match: ${suggestions}. Si quieres, te filtro mas fino por barrio, habitaciones o presupuesto.`;
  }

  private buildUnavailableAIReply(): string {
    return "El asesor IA esta temporalmente no disponible por limite de uso del proveedor. Puedes intentar de nuevo en unos minutos; mientras tanto, revisa las propiedades sugeridas que te muestro abajo.";
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    return String(error);
  }

  private isQuotaOrRateLimitError(error: unknown): boolean {
    const message = this.getErrorMessage(error).toLowerCase();

    return (
      message.includes("429") ||
      message.includes("quota") ||
      message.includes("rate limit") ||
      message.includes("too many requests")
    );
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
    const embeddingDimensions = queryEmbedding.length;

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

    try {
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
          AND vector_dims("embedding") = ${embeddingDimensions}
        ORDER BY "embedding" <=> ${queryVector}::vector ASC
        LIMIT ${safeLimit}
      `;

      if (rows.length === 0) {
        return this.searchByKeywordFallback(normalizedQuery, safeLimit);
      }

      return rows;
    } catch (error: unknown) {
      const errorMessage = this.getErrorMessage(error);

      logger.warn("Vector search failed. Falling back to keyword search.", {
        error: errorMessage,
      });

      return this.searchByKeywordFallback(normalizedQuery, safeLimit);
    }
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
        logger.warn("Gemini returned an empty embedding for property.", {
          title: property.title,
          city: property.city,
        });
        return null;
      }

      return normalizeEmbedding(embedding);
    } catch (error: unknown) {
      logger.error("Failed to generate property embedding with Gemini.", {
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

  private parseMatchAlertToolArgs(rawArguments: string): MatchAlertToolArgs | null {
    try {
      const parsed: unknown = JSON.parse(rawArguments);
      if (!parsed || typeof parsed !== "object") return null;

      const candidate = parsed as Record<string, unknown>;
      const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
      const phone = typeof candidate.phone === "string" ? candidate.phone.trim() : "";
      const criteria = typeof candidate.criteria === "string" ? candidate.criteria.trim() : "";

      if (!name || !phone || !criteria) return null;

      return {
        name,
        phone,
        criteria,
      };
    } catch {
      return null;
    }
  }

  private parseOptionalNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private parseSearchCatalogToolArgs(rawArguments: string): SearchCatalogToolArgs | null {
    try {
      const parsed: unknown = JSON.parse(rawArguments);
      if (!parsed || typeof parsed !== "object") return null;

      const candidate = parsed as Record<string, unknown>;
      const args: SearchCatalogToolArgs = {};

      if (typeof candidate.city === "string") {
        const city = candidate.city.trim();
        if (city.length > 0) {
          args.city = city;
        }
      }

      if (Object.prototype.hasOwnProperty.call(candidate, "minPrice")) {
        const parsedMinPrice = this.parseOptionalNumber(candidate.minPrice);
        if (parsedMinPrice === null) return null;
        args.minPrice = parsedMinPrice;
      }

      if (Object.prototype.hasOwnProperty.call(candidate, "maxPrice")) {
        const parsedMaxPrice = this.parseOptionalNumber(candidate.maxPrice);
        if (parsedMaxPrice === null) return null;
        args.maxPrice = parsedMaxPrice;
      }

      if (Object.prototype.hasOwnProperty.call(candidate, "sortBy")) {
        const sortBy = candidate.sortBy;
        if (
          sortBy !== "price_asc" &&
          sortBy !== "price_desc" &&
          sortBy !== "recent"
        ) {
          return null;
        }

        args.sortBy = sortBy;
      }

      if (
        args.minPrice !== undefined &&
        args.maxPrice !== undefined &&
        args.minPrice > args.maxPrice
      ) {
        return null;
      }

      return args;
    } catch {
      return null;
    }
  }

  private parseQueryPublicPropertiesToolArgs(
    rawArguments: string,
  ): QueryPublicPropertiesToolArgs | null {
    try {
      const parsed: unknown = JSON.parse(rawArguments);
      if (!parsed || typeof parsed !== "object") return null;

      const candidate = parsed as Record<string, unknown>;
      const sql = typeof candidate.sql === "string" ? candidate.sql.trim() : "";

      if (sql.length === 0) return null;

      return {
        sql,
      };
    } catch {
      return null;
    }
  }

  private validatePublicPropertiesSql(sql: string): ValidatedPublicPropertiesSql {
    const normalizedSql = sql.trim().replace(/\s+/g, " ");
    const lowerSql = normalizedSql.toLowerCase();

    if (normalizedSql.length === 0) {
      throw new Error("La consulta SQL esta vacia.");
    }

    if (normalizedSql.length > MAX_AI_SQL_LENGTH) {
      throw new Error("La consulta SQL excede el tamano permitido.");
    }

    if (!lowerSql.startsWith("select ")) {
      throw new Error("Solo se permiten consultas SELECT.");
    }

    if (!/\bfrom\s+public_properties\b/i.test(normalizedSql)) {
      throw new Error("La consulta debe usar exclusivamente la vista public_properties.");
    }

    if (/;|--|\/\*|\*\//.test(normalizedSql)) {
      throw new Error("La consulta contiene comentarios o separadores no permitidos.");
    }

    if (/\bfrom\s+public_properties\s*,/i.test(normalizedSql)) {
      throw new Error("La consulta no puede combinar public_properties con otras relaciones.");
    }

    if (/["'`]*\b(property|user|lease|payment|notification|favorite|lead|matchalert|scrapingfuente)\b["'`]*/i.test(normalizedSql)) {
      throw new Error("La consulta intenta acceder a tablas reales no permitidas.");
    }

    const forbiddenPattern =
      /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|execute|call|do|set|reset|show|listen|notify|vacuum|analyze|refresh|reindex|lock|comment|copy|merge|with|union|intersect|except|join|lateral|pg_sleep|generate_series|dblink|lo_import|lo_export|information_schema|current_setting|current_user|session_user|version)\b/i;

    if (forbiddenPattern.test(normalizedSql)) {
      throw new Error("La consulta usa una instruccion o funcion no permitida.");
    }

    const relationMatches = Array.from(
      normalizedSql.matchAll(/\bfrom\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/gi),
    );

    if (
      relationMatches.length !== 1 ||
      relationMatches[0]?.[1]?.toLowerCase() !== "public_properties"
    ) {
      throw new Error("La consulta solo puede leer desde public_properties una vez.");
    }

    return {
      sql: normalizedSql,
    };
  }

  private serializeQueryValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
      return value;
    }

    if (typeof value === "object" && "toString" in value) {
      return String(value);
    }

    return String(value);
  }

  private serializeQueryRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    return rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, this.serializeQueryValue(value)]),
      ),
    );
  }

  private async executeCreateMatchAlertTool(rawArguments: string): Promise<string> {
    const args = this.parseMatchAlertToolArgs(rawArguments);

    if (!args) {
      return JSON.stringify({
        ok: false,
        error:
          "Argumentos invalidos para create_match_alert. Se requiere name, phone y criteria como texto no vacio.",
      });
    }

    try {
      const created = await prisma.matchAlert.create({
        data: {
          name: args.name,
          phone: args.phone,
          criteria: args.criteria,
        },
      });

      return JSON.stringify({
        ok: true,
        id: created.id,
        status: created.status,
        name: created.name,
        phone: created.phone,
        criteria: created.criteria,
        createdAt: created.createdAt.toISOString(),
      });
    } catch (error: unknown) {
      logger.error("Failed to create match alert from tool call.", {
        error: error instanceof Error ? error.message : String(error),
      });

      return JSON.stringify({
        ok: false,
        error: "No fue posible guardar la alerta de match en este momento.",
      });
    }
  }

  private async executeSearchCatalogTool(rawArguments: string): Promise<string> {
    const args = this.parseSearchCatalogToolArgs(rawArguments);

    if (!args) {
      return JSON.stringify({
        ok: false,
        error:
          "Argumentos invalidos para search_catalog. city es string, minPrice/maxPrice son numeros y sortBy debe ser price_asc, price_desc o recent.",
      });
    }

    const where: Prisma.PropertyWhereInput = {
      status: "AVAILABLE",
      price: {
        gte: MIN_AI_PROPERTY_PRICE_COP,
      },
    };

    if (args.city) {
      const resolvedCity = resolveCityByInput(args.city);

      if (resolvedCity) {
        const cityCandidates = Array.from(
          new Set([args.city, resolvedCity.name, ...resolvedCity.aliases]),
        );

        where.OR = cityCandidates.map((candidate) => ({
          city: {
            contains: candidate,
            mode: "insensitive",
          },
        }));
      } else {
        where.city = {
          contains: args.city,
          mode: "insensitive",
        };
      }
    }

    if (args.minPrice !== undefined || args.maxPrice !== undefined) {
      const minPrice = Math.max(args.minPrice ?? MIN_AI_PROPERTY_PRICE_COP, MIN_AI_PROPERTY_PRICE_COP);

      where.price = {
        gte: minPrice,
        ...(args.maxPrice !== undefined ? { lte: args.maxPrice } : {}),
      };
    }

    const orderBy: Prisma.PropertyOrderByWithRelationInput =
      args.sortBy === "price_asc"
        ? { price: "asc" }
        : args.sortBy === "price_desc"
          ? { price: "desc" }
          : { createdAt: "desc" };

    try {
      const properties = await prisma.property.findMany({
        where,
        orderBy,
        take: 3,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          city: true,
          neighborhood: true,
          rooms: true,
          type: true,
          createdAt: true,
        },
      });

      return JSON.stringify({
        ok: true,
        count: properties.length,
        filtersApplied: {
          city: args.city ?? null,
          minPrice: args.minPrice ?? null,
          maxPrice: args.maxPrice ?? null,
          sortBy: args.sortBy ?? "recent",
        },
        properties: properties.map((property) => ({
          ...property,
          price: property.price.toString(),
          createdAt: property.createdAt.toISOString(),
        })),
      });
    } catch (error: unknown) {
      logger.error("Failed to search catalog from tool call.", {
        error: error instanceof Error ? error.message : String(error),
      });

      return JSON.stringify({
        ok: false,
        error: "No fue posible consultar el catalogo en este momento.",
      });
    }
  }

  private async executeQueryPublicPropertiesTool(rawArguments: string): Promise<string> {
    const args = this.parseQueryPublicPropertiesToolArgs(rawArguments);

    if (!args) {
      return JSON.stringify({
        ok: false,
        error: "Argumentos invalidos para query_public_properties. Se requiere sql como texto.",
      });
    }

    let validatedSql: ValidatedPublicPropertiesSql;

    try {
      validatedSql = this.validatePublicPropertiesSql(args.sql);
    } catch (error: unknown) {
      return JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "La consulta SQL no paso validacion.",
      });
    }

    const readOnlyQuery = `
      WITH public_properties AS (
        SELECT
          "id"::text AS id,
          "title" AS title,
          "description" AS description,
          "price"::numeric AS price,
          "location" AS location,
          "city" AS city,
          "neighborhood" AS neighborhood,
          "rooms" AS rooms,
          "type"::text AS type,
          "isScraped" AS is_scraped,
          "isFeatured" AS is_featured,
          "createdAt" AS created_at
        FROM "Property"
        WHERE "status" = 'AVAILABLE'::"PropertyStatus"
          AND "price" >= ${MIN_AI_PROPERTY_PRICE_COP}
      )
      SELECT *
      FROM (${validatedSql.sql}) AS ai_result
      LIMIT ${MAX_AI_SQL_ROWS}
    `;

    try {
      const rows = await prisma.$transaction(async (transaction) => {
        await transaction.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        await transaction.$executeRawUnsafe("SET LOCAL statement_timeout = '2500ms'");

        return transaction.$queryRawUnsafe<Array<Record<string, unknown>>>(readOnlyQuery);
      });

      return JSON.stringify({
        ok: true,
        rowCount: rows.length,
        maxRows: MAX_AI_SQL_ROWS,
        sql: validatedSql.sql,
        rows: this.serializeQueryRows(rows),
      });
    } catch (error: unknown) {
      logger.error("Failed to execute AI public properties SQL query.", {
        error: error instanceof Error ? error.message : String(error),
        sql: validatedSql.sql,
      });

      return JSON.stringify({
        ok: false,
        error:
          "No fue posible ejecutar la consulta segura. Revisa columnas, filtros y agregaciones.",
      });
    }
  }

  private hasLikelyPhone(text: string): boolean {
    return /(?:\+?\d[\d\s-]{6,}\d)/.test(text);
  }

  private hasExactContextMatch(properties: SimilarProperty[]): boolean {
    return properties.some((property) => property.similarity >= 0.8);
  }

  private createTextStreamFromString(text: string): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  }

  private async createAssistantReplyStream(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): Promise<{ stream: ReadableStream<Uint8Array> | null; error?: unknown }> {
    if (!this.client) {
      return { stream: null };
    }

    try {
      const completionStream = await this.client.chat.completions.create({
        model: CHAT_MODEL,
        temperature: 0.35,
        messages,
        stream: true,
      });

      const encoder = new TextEncoder();

      return {
        stream: new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of completionStream) {
              const contentChunk = chunk.choices[0]?.delta?.content;

              if (contentChunk) {
                controller.enqueue(encoder.encode(contentChunk));
              }
            }

            controller.close();
          } catch (error: unknown) {
            controller.error(error);
          }
        },
        }),
      };
    } catch (error: unknown) {
      logger.error("Failed to create streaming chat completion for assessor.", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        stream: null,
        error,
      };
    }
  }

  private normalizeChatHistory(history: ChatHistoryMessage[]): ChatHistoryMessage[] {
    return history
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }))
      .filter((message) => message.content.length > 0)
      .slice(-8);
  }

  private buildContextualSearchQuery(
    userMessage: string,
    history: ChatHistoryMessage[],
  ): string {
    const recentUserMessages = history
      .filter((message) => message.role === "user")
      .map((message) => message.content)
      .slice(-4);

    return [...recentUserMessages, userMessage].join("\n");
  }

  async chatWithAssessorStream(
    userMessage: string,
    conversationHistory: ChatHistoryMessage[] = [],
  ): Promise<ChatWithAssessorStreamResult> {
    const normalizedMessage = userMessage.trim();
    const normalizedHistory = this.normalizeChatHistory(conversationHistory);

    if (normalizedMessage.length === 0) {
      const reply =
        "Comparte tu consulta y con gusto te ayudo a encontrar una propiedad ideal en el Valle de Aburra.";

      return {
        replyStream: this.createTextStreamFromString(reply),
        contextProperties: [],
      };
    }

    const contextualSearchQuery = this.buildContextualSearchQuery(
      normalizedMessage,
      normalizedHistory,
    );
    const contextProperties = await this.searchSimilarProperties(contextualSearchQuery, 5);
    const context = this.formatPropertiesAsContext(contextProperties);

    if (!this.client) {
      this.warnMissingKeyOnce();

      return {
        replyStream: this.createTextStreamFromString(
          this.buildFallbackChatReply(contextProperties),
        ),
        contextProperties,
      };
    }

    const systemPrompt =
      "Eres el Asesor Inmobiliario de RentVago, experto en arriendos del Valle de Aburra (Medellin, Envigado, Itagui, etc.). Habla en espanol colombiano neutro, amable y directo. NO uses tono paisa ni muletillas como 'parce', 'upa', 'sisas', 'de una' o 'super'. NUNCA inventes propiedades o metricas. Para preguntas exactas, filtros por presupuesto/barrio/ciudad, rankings, conteos, promedios, minimos, maximos o analitica del catalogo, USA OBLIGATORIAMENTE query_public_properties antes de responder. Esa herramienta solo permite SQL SELECT sobre la vista virtual public_properties, con columnas id, title, description, price, location, city, neighborhood, rooms, type, is_scraped, is_featured y created_at. En RentVago, palabras como casa, apartamento, apartaestudio, apto, inmueble, hogar, arriendo o propiedad significan propiedad disponible en general: NO filtres por la columna type aunque el usuario diga casa o apartamento, salvo que el usuario pida explicitamente comparar tipos. Si el usuario corrige o continua con frases como 'entonces cuales me servirian', 'si tenemos', 'revisa en la base de datos' o 'de menos de X', usa el historial reciente para completar barrio, presupuesto y criterio. Ejemplo para 'cual es la casa mas barata': SELECT id, title, price, city, neighborhood, rooms FROM public_properties ORDER BY price ASC LIMIT 5. Ejemplo para presupuesto y barrio: SELECT id, title, price, city, neighborhood, rooms FROM public_properties WHERE price <= 200000 AND (neighborhood ILIKE '%robledo%' OR location ILIKE '%robledo%') ORDER BY price ASC LIMIT 5. Ejemplo para barrio con mas arriendos: SELECT COALESCE(neighborhood, 'Sin barrio') AS neighborhood, COUNT(*) AS total FROM public_properties GROUP BY COALESCE(neighborhood, 'Sin barrio') ORDER BY total DESC LIMIT 5. Usa search_catalog solo para busquedas simples por ciudad/precio si no necesitas SQL agregado. Usa el contexto semantico solo como apoyo conversacional, no como fuente total de verdad. Si no existen resultados reales, dilo con claridad y ofrece crear una 'Alerta de Match'. Pide nombre y WhatsApp o telefono. CUANDO te de esos datos, usa OBLIGATORIAMENTE create_match_alert para guardarlo en el sistema. Nunca uses create_match_alert sin tener el telefono. Si en el mensaje actual ya tienes nombre, telefono y criterio, ejecuta de una vez create_match_alert y luego confirma que quedo guardada.";

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `${systemPrompt}\n\nContexto de propiedades disponibles:\n${context}`,
        },
        ...normalizedHistory.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: "user",
          content: normalizedMessage,
        },
      ];

      const noExactContextMatch = !this.hasExactContextMatch(contextProperties);
      const shouldForceMatchAlertTool =
        noExactContextMatch && this.hasLikelyPhone(normalizedMessage);

      const toolChoice = shouldForceMatchAlertTool
        ? ({ type: "function", function: { name: CREATE_MATCH_ALERT_TOOL_NAME } } as const)
        : ("auto" as const);

      for (let round = 0; round < MAX_TOOL_CALL_ROUNDS; round += 1) {
        const completion = await this.client.chat.completions.create({
          model: CHAT_MODEL,
          temperature: 0.35,
          messages,
          tools: [MATCH_ALERT_TOOL, SEARCH_CATALOG_TOOL, QUERY_PUBLIC_PROPERTIES_TOOL],
          tool_choice: round === 0 ? toolChoice : "auto",
        });

        const assistantMessage = completion.choices[0]?.message;
        if (!assistantMessage) {
          break;
        }

        const toolCalls = assistantMessage.tool_calls ?? [];
        if (toolCalls.length === 0) {
          const immediateReply = assistantMessage.content?.trim();

          if (immediateReply) {
            return {
              replyStream: this.createTextStreamFromString(immediateReply),
              contextProperties,
            };
          }

          break;
        }

        messages.push({
          role: "assistant",
          content: assistantMessage.content ?? "",
          tool_calls: assistantMessage.tool_calls,
        });

        for (const toolCall of toolCalls) {
          if (toolCall.type !== "function") continue;

          if (
            toolCall.function.name !== CREATE_MATCH_ALERT_TOOL_NAME &&
            toolCall.function.name !== SEARCH_CATALOG_TOOL_NAME &&
            toolCall.function.name !== QUERY_PUBLIC_PROPERTIES_TOOL_NAME
          ) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                ok: false,
                error: `La herramienta ${toolCall.function.name} no esta soportada.`,
              }),
            });
            continue;
          }

          const toolResult =
            toolCall.function.name === CREATE_MATCH_ALERT_TOOL_NAME
              ? await this.executeCreateMatchAlertTool(toolCall.function.arguments)
              : toolCall.function.name === SEARCH_CATALOG_TOOL_NAME
                ? await this.executeSearchCatalogTool(toolCall.function.arguments)
                : await this.executeQueryPublicPropertiesTool(toolCall.function.arguments);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }
      }

      const streamResult = await this.createAssistantReplyStream(messages);
      const replyStream = streamResult.stream;

      if (replyStream) {
        return {
          replyStream,
          contextProperties,
        };
      }

      if (this.isQuotaOrRateLimitError(streamResult.error)) {
        return {
          replyStream: this.createTextStreamFromString(this.buildUnavailableAIReply()),
          contextProperties,
        };
      }

      return {
        replyStream: this.createTextStreamFromString(
          this.buildFallbackChatReply(contextProperties),
        ),
        contextProperties,
      };
    } catch (error: unknown) {
      logger.error("Failed to generate streaming chat completion for assessor.", {
        error: error instanceof Error ? error.message : String(error),
      });

      if (this.isQuotaOrRateLimitError(error)) {
        return {
          replyStream: this.createTextStreamFromString(this.buildUnavailableAIReply()),
          contextProperties,
        };
      }

      return {
        replyStream: this.createTextStreamFromString(this.buildFallbackChatReply(contextProperties)),
        contextProperties,
      };
    }
  }

  async chatWithAssessor(
    userMessage: string,
    conversationHistory: ChatHistoryMessage[] = [],
  ): Promise<ChatWithAssessorResult> {
    const { replyStream, contextProperties } = await this.chatWithAssessorStream(
      userMessage,
      conversationHistory,
    );
    const reader = replyStream.getReader();
    const decoder = new TextDecoder();
    let reply = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          reply += decoder.decode(value, { stream: true });
        }
      }

      reply += decoder.decode();
    } catch (error: unknown) {
      logger.error("Failed to read assessor stream response.", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const normalizedReply = reply.trim();

    return {
      reply: normalizedReply || this.buildFallbackChatReply(contextProperties),
      contextProperties,
    };
  }
}

export const aiService = new AIService();
