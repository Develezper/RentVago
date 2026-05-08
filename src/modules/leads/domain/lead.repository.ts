import type { CreatedLead, PropertyLeadTarget } from "@/modules/leads/domain/lead.types";

export interface LeadRepository {
  findPropertyLeadTarget(propertyId: string): Promise<PropertyLeadTarget | null>;
  createLead(input: { propertyId: string; userId: string; ownerId: string }): Promise<CreatedLead>;
}
