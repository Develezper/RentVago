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
  property: {
    id: string;
    title: string;
    description: string;
    images: string[];
    price: { toString(): string };
    location: string;
    rooms: number | null;
  };
}

export interface UserFavoritePropertyIdItem {
  propertyId: string;
}
