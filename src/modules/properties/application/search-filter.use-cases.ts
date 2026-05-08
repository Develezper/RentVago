import type {
  SaveSearchFilterInput,
  UserSearchFilter,
} from "@/modules/properties/domain/search-filter.types";
import { searchFilterRepository } from "@/modules/properties/infrastructure/search-filter.repository";

const getLatestForUser = (userId: string): Promise<UserSearchFilter | null> => {
  return searchFilterRepository.getLatestForUser(userId);
};

const listForUser = (userId: string): Promise<UserSearchFilter[]> => {
  return searchFilterRepository.listForUser(userId);
};

const getByIdForUser = (userId: string, id: string): Promise<UserSearchFilter | null> => {
  return searchFilterRepository.getByIdForUser(userId, id);
};

const createForUser = (
  userId: string,
  input: SaveSearchFilterInput,
): Promise<UserSearchFilter> => {
  return searchFilterRepository.createForUser(userId, input);
};

const updateByIdForUser = (
  userId: string,
  id: string,
  input: SaveSearchFilterInput,
): Promise<UserSearchFilter | null> => {
  return searchFilterRepository.updateByIdForUser(userId, id, input);
};

const deleteByIdForUser = (userId: string, id: string): Promise<boolean> => {
  return searchFilterRepository.deleteByIdForUser(userId, id);
};

const saveLatestForUser = (
  userId: string,
  input: SaveSearchFilterInput,
): Promise<UserSearchFilter> => {
  return searchFilterRepository.saveLatestForUser(userId, input);
};

export const searchFilterUseCases = {
  listForUser,
  getByIdForUser,
  createForUser,
  updateByIdForUser,
  deleteByIdForUser,
  getLatestForUser,
  saveLatestForUser,
};
