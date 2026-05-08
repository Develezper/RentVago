import { prisma } from "@/lib/prisma";
import type { FavoriteRepository } from "@/modules/properties/domain/favorite.repository";

class PrismaFavoriteRepository implements FavoriteRepository {
  async propertyExists(propertyId: string): Promise<boolean> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });

    return property !== null;
  }

  async hasFavorite(userId: string, propertyId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
      select: { id: true },
    });

    return Boolean(favorite);
  }

  async createFavorite(userId: string, propertyId: string): Promise<void> {
    await prisma.favorite.create({ data: { userId, propertyId } });
  }

  async deleteFavorite(userId: string, propertyId: string): Promise<void> {
    await prisma.favorite.delete({
      where: { userId_propertyId: { userId, propertyId } },
    });
  }

  async getUserFavorites(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            description: true,
            images: true,
            price: true,
            location: true,
            rooms: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listFavoritePropertyIdsForUser(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      select: { propertyId: true },
    });
  }
}

export const favoriteRepository: FavoriteRepository = new PrismaFavoriteRepository();
