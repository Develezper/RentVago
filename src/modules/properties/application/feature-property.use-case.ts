import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PropertiesRepository } from "@/modules/properties/domain/property.repository";
import type { PaymentOrder } from "@/modules/properties/domain/property.types";

const FEATURE_DURATION_DAYS = 30;
const FEATURE_PRICE_COP = 59000;

const featurePropertySchema = z
  .object({
    propertyId: z.string().uuid(),
    ownerId: z.string().uuid(),
  })
  .strict();

export class FeaturePropertyUseCaseError extends Error {
  constructor(
    public readonly code:
      | "PROPERTY_NOT_FOUND"
      | "FORBIDDEN"
      | "PROPERTY_NOT_OWNED"
      | "INVALID_STATUS",
    message: string,
  ) {
    super(message);
    this.name = "FeaturePropertyUseCaseError";
  }
}

export interface FeaturePropertyResult {
  order: PaymentOrder;
  property: {
    id: string;
    isFeatured: boolean;
    featuredUntil: Date | null;
  };
}

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export class FeaturePropertyUseCase {
  constructor(private readonly repository: PropertiesRepository) {}

  async execute(input: unknown): Promise<FeaturePropertyResult> {
    const payload = featurePropertySchema.parse(input);
    const property = await this.repository.getPropertyById(payload.propertyId);

    if (!property) {
      throw new FeaturePropertyUseCaseError(
        "PROPERTY_NOT_FOUND",
        "La propiedad no existe.",
      );
    }

    if (!property.ownerId) {
      throw new FeaturePropertyUseCaseError(
        "PROPERTY_NOT_OWNED",
        "La propiedad no tiene un dueno asociado.",
      );
    }

    if (property.ownerId !== payload.ownerId) {
      throw new FeaturePropertyUseCaseError(
        "FORBIDDEN",
        "No tienes permisos para destacar esta propiedad.",
      );
    }

    if (property.status === "RENTED") {
      throw new FeaturePropertyUseCaseError(
        "INVALID_STATUS",
        "No puedes destacar una propiedad arrendada.",
      );
    }

    // Simula una validacion de pago aprobada por un gateway externo.
    const paidAt = new Date();
    const featuredUntil = addDays(paidAt, FEATURE_DURATION_DAYS);

    const paymentOrder: PaymentOrder = {
      id: randomUUID(),
      propertyId: property.id,
      ownerId: payload.ownerId,
      amount: FEATURE_PRICE_COP,
      currency: "COP",
      status: "PAID",
      createdAt: paidAt,
      paidAt,
    };

    const featuredProperty = await this.repository.markPropertyAsFeatured(
      property.id,
      featuredUntil,
    );

    return {
      order: paymentOrder,
      property: {
        id: featuredProperty.id,
        isFeatured: featuredProperty.isFeatured,
        featuredUntil: featuredProperty.featuredUntil,
      },
    };
  }
}
