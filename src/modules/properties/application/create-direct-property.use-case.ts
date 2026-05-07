import type { PropertiesRepository } from "@/modules/properties/domain/property.repository";
import type { CreatePropertyDTO } from "@/modules/properties/domain/property.types";
import { normalizePositivePriceToNumber } from "@/modules/properties/infrastructure/price-helper";
import { UploadPropertyImagesUseCase } from "@/modules/properties/application/upload-property-images.use-case";
import { z } from "zod";

const asOptionalString = (value: unknown): unknown => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }
  return value;
};

const toOptionalNumber = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim().length === 0) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return normalizePositivePriceToNumber(value);
  return value;
};

const createDirectPropertySchema = z
  .object({
    title: z.preprocess(asOptionalString, z.string().min(1).max(200)),
    description: z.preprocess(asOptionalString, z.string().max(5000).optional()),
    location: z.preprocess(asOptionalString, z.string().max(200).optional()),
    city: z.preprocess(asOptionalString, z.string().min(1).max(120)),
    neighborhood: z.preprocess(asOptionalString, z.string().max(120).optional()),
    price: z.preprocess(toOptionalNumber, z.number().positive().finite()),
    rooms: z.preprocess(toOptionalNumber, z.number().int().min(1).max(50).optional()),
    type: z.enum(["CASA", "APARTAMENTO"]),
    images: z.array(z.string().url()).optional(),
  })
  .strict();

export class CreateDirectPropertyUseCase {
  constructor(
    private readonly repository: PropertiesRepository,
    private readonly uploadPropertyImagesUseCase: UploadPropertyImagesUseCase =
      new UploadPropertyImagesUseCase(),
  ) {}

  async execute(input: unknown, ownerId: string): Promise<{ id: string }> {
    const payload = createDirectPropertySchema.parse(input);
    const images = await this.uploadPropertyImagesUseCase.execute({
      images: payload.images,
      source: "DIRECT",
    });

    const data: CreatePropertyDTO = {
      title: payload.title,
      description: payload.description,
      location: payload.location,
      city: payload.city,
      neighborhood: payload.neighborhood,
      price: payload.price,
      rooms: payload.rooms,
      type: payload.type,
      images,
    };

    return this.repository.createDirectProperty(data, ownerId);
  }
}