import type { Property } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type FavoriteErrorCode = "PROPERTY_NOT_FOUND";

export class FavoriteServiceError extends Error {
  public readonly code: FavoriteErrorCode;
  public readonly statusCode: 404;

  constructor(code: FavoriteErrorCode, message: string) {
    super(message);
    this.name = "FavoriteServiceError";
    this.code = code;
    this.statusCode = 404;
  }
}

export interface FavoriteToggleResult {
  propertyId: string;
  isFavorite: boolean;
}

export interface UserFavoriteItem {
  id: string;
  propertyId: string;
  createdAt: Date;
  property: Property;
}

export interface UserFavoritePropertyIdItem {
  propertyId: string;
}

export const toggleFavorite = async (
  userId: string,
  propertyId: string,
): Promise<FavoriteToggleResult> => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true },
  });

  if (!property) {
    throw new FavoriteServiceError("PROPERTY_NOT_FOUND", "Property not found for favorites.");
  }

  const existingFavorite = await prisma.favorite.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
    select: { id: true },
  });

  if (existingFavorite) {
    await prisma.favorite.delete({
      where: { userId_propertyId: { userId, propertyId } },
    });
    return { propertyId, isFavorite: false };
  }

  await prisma.favorite.create({ data: { userId, propertyId } });
  return { propertyId, isFavorite: true };
};

export const getUserFavorites = async (userId: string): Promise<UserFavoriteItem[]> => {
  return prisma.favorite.findMany({
    where: { userId },
    include: { property: true },
    orderBy: { createdAt: "desc" },
  });
};

export const listFavoritePropertyIdsForUser = async (
  userId: string,
): Promise<UserFavoritePropertyIdItem[]> => {
  return prisma.favorite.findMany({
    where: { userId },
    select: { propertyId: true },
  });
};

export const isPropertyFavorite = async (
  userId: string,
  propertyId: string,
): Promise<boolean> => {
  const favorite = await prisma.favorite.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
    select: { id: true },
  });
  return Boolean(favorite);
};

export const favoriteService = {
  toggleFavorite,
  getUserFavorites,
  listFavoritePropertyIdsForUser,
  isPropertyFavorite,
};
