import type {
  AdminPropertyCreateInput,
  AdminPropertyUpdateInput,
  PaymentOrder,
  PublicPropertyCountQuery,
  PropertySearchFilters,
  PropertySearchResult,
  PublicPropertyListQuery,
} from "@/modules/properties/domain/property.types";
import { propertiesRepository } from "@/modules/properties/infrastructure/property.repository";
import { GetRecommendedPropertiesUseCase } from "@/modules/properties/application/get-recommended-properties.use-case";
import {
  FeaturePropertyUseCase,
  type FeaturePropertyResult,
} from "@/modules/properties/application/feature-property.use-case";

const getRecommendedPropertiesUseCase = new GetRecommendedPropertiesUseCase(propertiesRepository);
const featurePropertyUseCase = new FeaturePropertyUseCase(propertiesRepository);

const searchProperties = (filters: PropertySearchFilters): Promise<PropertySearchResult> => {
  return propertiesRepository.searchProperties(filters);
};

const listPublicProperties = (query: PublicPropertyListQuery) => {
  return propertiesRepository.listPublicProperties(query);
};

const countPublicProperties = (query: PublicPropertyCountQuery) => {
  return propertiesRepository.countPublicProperties(query);
};

const getRecommendedProperties = (input: {
  userId?: string | null;
  preferredCity?: string | null;
  limit?: number;
}) => {
  return getRecommendedPropertiesUseCase.execute(input);
};

const getPublicPropertyById = (id: string) => {
  return propertiesRepository.getPublicPropertyById(id);
};

const getPropertyById = (id: string) => {
  return propertiesRepository.getPropertyById(id);
};

const listOwnerProperties = (ownerId: string) => {
  return propertiesRepository.listOwnerProperties(ownerId);
};

const listAdminProperties = () => {
  return propertiesRepository.listAdminProperties();
};

const createAdminProperty = (input: AdminPropertyCreateInput) => {
  return propertiesRepository.createAdminProperty(input);
};

const updateAdminProperty = (id: string, input: AdminPropertyUpdateInput) => {
  return propertiesRepository.updateAdminProperty(id, input);
};

const deleteAdminProperty = (id: string) => {
  return propertiesRepository.deleteAdminProperty(id);
};

const listPropertyOptions = () => {
  return propertiesRepository.listPropertyOptions();
};

const featureProperty = (input: {
  propertyId: string;
  ownerId: string;
  paymentValidation: {
    status: "PAID";
    amount: number;
    currency: "COP";
    paidAt: Date;
    checkoutTokenId: string;
  };
}): Promise<FeaturePropertyResult> => {
  return featurePropertyUseCase.execute(input);
};

export const propertiesUseCases = {
  searchProperties,
  listPublicProperties,
  countPublicProperties,
  getRecommendedProperties,
  getPublicPropertyById,
  getPropertyById,
  listOwnerProperties,
  listAdminProperties,
  createAdminProperty,
  updateAdminProperty,
  deleteAdminProperty,
  listPropertyOptions,
  featureProperty,
};

export type {
  AdminPropertyCreateInput,
  AdminPropertyUpdateInput,
  PaymentOrder,
  PublicPropertyCountQuery,
  PropertySearchFilters,
  PropertySearchResult,
  PublicPropertyListQuery,
};
