import type {
  SaveSearchFilterInput,
  UserSearchFilter,
} from "./search-filter.types";

export interface SearchFilterRepository {
  getLatestForUser(userId: string): Promise<UserSearchFilter | null>;
  listForUser(userId: string): Promise<UserSearchFilter[]>;
  getByIdForUser(userId: string, id: string): Promise<UserSearchFilter | null>;
  createForUser(userId: string, input: SaveSearchFilterInput): Promise<UserSearchFilter>;
  updateByIdForUser(
    userId: string,
    id: string,
    input: SaveSearchFilterInput,
  ): Promise<UserSearchFilter | null>;
  deleteByIdForUser(userId: string, id: string): Promise<boolean>;
  saveLatestForUser(userId: string, input: SaveSearchFilterInput): Promise<UserSearchFilter>;
}
