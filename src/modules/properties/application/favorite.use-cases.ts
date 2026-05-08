import type {
  FavoriteToggleResult,
  UserFavoriteItem,
  UserFavoritePropertyIdItem,
} from "@/modules/properties/domain/favorite.types";
import { FavoriteServiceError } from "@/modules/properties/domain/favorite.types";
import { favoriteRepository } from "@/modules/properties/infrastructure/favorite.repository";

const toggleFavorite = async (
  userId: string,
  propertyId: string,
): Promise<FavoriteToggleResult> => {
  const propertyExists = await favoriteRepository.propertyExists(propertyId);

  if (!propertyExists) {
    throw new FavoriteServiceError("PROPERTY_NOT_FOUND", "Property not found for favorites.");
  }

  const isFavorite = await favoriteRepository.hasFavorite(userId, propertyId);

  if (isFavorite) {
    await favoriteRepository.deleteFavorite(userId, propertyId);
    return { propertyId, isFavorite: false };
  }

  await favoriteRepository.createFavorite(userId, propertyId);
  return { propertyId, isFavorite: true };
};

const getUserFavorites = (userId: string): Promise<UserFavoriteItem[]> => {
  return favoriteRepository.getUserFavorites(userId);
};

const listFavoritePropertyIdsForUser = (
  userId: string,
): Promise<UserFavoritePropertyIdItem[]> => {
  return favoriteRepository.listFavoritePropertyIdsForUser(userId);
};

const isPropertyFavorite = async (userId: string, propertyId: string): Promise<boolean> => {
  return favoriteRepository.hasFavorite(userId, propertyId);
};

export const favoritesUseCases = {
  toggleFavorite,
  getUserFavorites,
  listFavoritePropertyIdsForUser,
  isPropertyFavorite,
};

export { FavoriteServiceError };
