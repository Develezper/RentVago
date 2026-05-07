import { PropertyStatus } from "@/generated/prisma/enums";
import { NotifyMatchingUsersUseCase } from "@/modules/properties/application/notify-matching-users.use-case";
import type { PropertiesRepository } from "@/modules/properties/domain/property.repository";

export class PropertyNotFoundError extends Error {
  constructor() {
    super("La propiedad no existe.");
    this.name = "PropertyNotFoundError";
  }
}

export class ApprovePropertyUseCase {
  constructor(
    private readonly repository: PropertiesRepository,
    private readonly notifyMatchingUsersUseCase?: NotifyMatchingUsersUseCase,
  ) {}

  async execute(id: string): Promise<{ id: string; status: PropertyStatus }> {
    const existingProperty = await this.repository.getPropertyById(id);

    if (!existingProperty) {
      throw new PropertyNotFoundError();
    }

    const updated = await this.repository.updatePropertyStatus(id, PropertyStatus.AVAILABLE);

    const shouldNotifyMatches =
      existingProperty.status === PropertyStatus.PENDING_REVIEW &&
      updated.status === PropertyStatus.AVAILABLE &&
      this.notifyMatchingUsersUseCase;

    if (shouldNotifyMatches) {
      try {
        await this.notifyMatchingUsersUseCase.execute({
          id: existingProperty.id,
          title: existingProperty.title,
          location: existingProperty.location,
          city: existingProperty.city,
          type: existingProperty.type,
          price: existingProperty.price,
        });
      } catch (error: unknown) {
        console.error("No fue posible enviar alertas de matching.", error);
      }
    }

    return updated;
  }
}
