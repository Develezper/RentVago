import type {
  AdminPropertyCreateInput,
  AdminPropertyUpdateInput,
  PropertySearchFilters,
  PropertySearchResult,
  PublicPropertyListQuery,
} from "@/modules/properties/domain/property.types";
import { propertiesRepository } from "@/modules/properties/infrastructure/property.repository";

const searchProperties = (filters: PropertySearchFilters): Promise<PropertySearchResult> => {
  return propertiesRepository.searchProperties(filters);
};

const listPublicProperties = (query: PublicPropertyListQuery) => {
  return propertiesRepository.listPublicProperties(query);
};

const getPublicPropertyById = (id: string) => {
  return propertiesRepository.getPublicPropertyById(id);
};

const getPropertyById = (id: string) => {
  return propertiesRepository.getPropertyById(id);
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

export const propertiesUseCases = {
  searchProperties,
  listPublicProperties,
  getPublicPropertyById,
  getPropertyById,
  listAdminProperties,
  createAdminProperty,
  updateAdminProperty,
  deleteAdminProperty,
  listPropertyOptions,
};

export type {
  AdminPropertyCreateInput,
  AdminPropertyUpdateInput,
  PropertySearchFilters,
  PropertySearchResult,
  PublicPropertyListQuery,
};
