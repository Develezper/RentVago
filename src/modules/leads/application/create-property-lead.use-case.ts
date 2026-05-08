import type { LeadRepository } from "@/modules/leads/domain/lead.repository";
import {
  LeadServiceError,
  type CreatePropertyLeadInput,
  type CreatedLead,
} from "@/modules/leads/domain/lead.types";

export class CreatePropertyLeadUseCase {
  constructor(private readonly leadRepository: LeadRepository) {}

  async execute(input: CreatePropertyLeadInput): Promise<CreatedLead> {
    const propertyTarget = await this.leadRepository.findPropertyLeadTarget(input.propertyId);

    if (!propertyTarget) {
      throw new LeadServiceError("PROPERTY_NOT_FOUND", "Property not found for lead creation.");
    }

    if (!propertyTarget.ownerId) {
      throw new LeadServiceError(
        "PROPERTY_WITHOUT_OWNER",
        "Property does not have a registered owner for direct contact.",
      );
    }

    if (propertyTarget.ownerId === input.userId) {
      throw new LeadServiceError(
        "CANNOT_CONTACT_OWN_PROPERTY",
        "Property owner cannot generate a lead on their own property.",
      );
    }

    return this.leadRepository.createLead({
      propertyId: input.propertyId,
      userId: input.userId,
      ownerId: propertyTarget.ownerId,
    });
  }
}
