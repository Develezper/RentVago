import type { LeadStatus } from "@/generated/prisma/enums";

export type LeadErrorCode =
  | "PROPERTY_NOT_FOUND"
  | "PROPERTY_WITHOUT_OWNER"
  | "CANNOT_CONTACT_OWN_PROPERTY";

export class LeadServiceError extends Error {
  public readonly code: LeadErrorCode;

  constructor(code: LeadErrorCode, message: string) {
    super(message);
    this.name = "LeadServiceError";
    this.code = code;
  }
}

export interface CreatePropertyLeadInput {
  propertyId: string;
  userId: string;
}

export interface PropertyLeadTarget {
  id: string;
  title: string;
  ownerId: string | null;
}

export interface CreatedLead {
  id: string;
  propertyId: string;
  userId: string;
  ownerId: string;
  status: LeadStatus;
  createdAt: Date;
}
