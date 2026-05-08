import type {
  UserFavoriteItem,
  UserFavoritePropertyIdItem,
} from "./favorite.types";

export interface FavoriteRepository {
  propertyExists(propertyId: string): Promise<boolean>;
  hasFavorite(userId: string, propertyId: string): Promise<boolean>;
  createFavorite(userId: string, propertyId: string): Promise<void>;
  deleteFavorite(userId: string, propertyId: string): Promise<void>;
  getUserFavorites(userId: string): Promise<UserFavoriteItem[]>;
  listFavoritePropertyIdsForUser(userId: string): Promise<UserFavoritePropertyIdItem[]>;
}
