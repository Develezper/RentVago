import { PropertyStatus } from "@/generated/prisma/enums";
import type { PropertiesRepository } from "@/modules/properties/domain/property.repository";

export class PropertyNotFoundError extends Error {
  constructor() {
    super("La propiedad no existe.");
    this.name = "PropertyNotFoundError";
  }
}

export class ApprovePropertyUseCase {
  constructor(private readonly repository: PropertiesRepository) {}

  async execute(id: string): Promise<{ id: string; status: PropertyStatus }> {
    const existingProperty = await this.repository.getPropertyById(id);

    if (!existingProperty) {
      throw new PropertyNotFoundError();
    }

    return this.repository.updatePropertyStatus(id, PropertyStatus.AVAILABLE);
  }
}
