import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  FEATURED_PROPERTY_DURATION_DAYS,
  FEATURED_PROPERTY_PRICE_COP,
} from "@/modules/properties/domain/feature.constants";
import type { PropertiesRepository } from "@/modules/properties/domain/property.repository";
import type { PaymentOrder } from "@/modules/properties/domain/property.types";

const featurePropertySchema = z
  .object({
    propertyId: z.string().uuid(),
    ownerId: z.string().uuid(),
    paymentValidation: z
      .object({
        status: z.literal("PAID"),
        amount: z.number().positive().finite(),
        currency: z.literal("COP"),
        paidAt: z.coerce.date(),
        checkoutTokenId: z.string().uuid(),
      })
      .strict(),
  })
  .strict();

export class FeaturePropertyUseCaseError extends Error {
  constructor(
    public readonly code:
      | "PROPERTY_NOT_FOUND"
      | "FORBIDDEN"
      | "PROPERTY_NOT_OWNED"
      | "INVALID_STATUS"
      | "ALREADY_FEATURED"
      | "INVALID_PAYMENT",
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

    const hasActiveFeature =
      property.isFeatured &&
      (property.featuredUntil === null || property.featuredUntil.getTime() >= Date.now());

    if (hasActiveFeature) {
      throw new FeaturePropertyUseCaseError(
        "ALREADY_FEATURED",
        "La propiedad ya tiene una destacacion activa.",
      );
    }

    if (payload.paymentValidation.amount !== FEATURED_PROPERTY_PRICE_COP) {
      throw new FeaturePropertyUseCaseError(
        "INVALID_PAYMENT",
        "Monto de pago invalido para la destacacion premium.",
      );
    }

    const paidAt = payload.paymentValidation.paidAt;
    const featuredUntil = addDays(paidAt, FEATURED_PROPERTY_DURATION_DAYS);

    const paymentOrder: PaymentOrder = {
      id: payload.paymentValidation.checkoutTokenId || randomUUID(),
      propertyId: property.id,
      ownerId: payload.ownerId,
      amount: payload.paymentValidation.amount,
      currency: payload.paymentValidation.currency,
      status: payload.paymentValidation.status,
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
