import { z } from "zod";

export interface FavoriteProperty {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  location: string;
  price: number | string;
  rooms: number;
}

export interface FavoriteItem {
  id: string;
  propertyId: string;
  property: FavoriteProperty;
}

export const favoritePropertySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  location: z.string(),
  price: z.union([z.number(), z.string()]),
  rooms: z.number().int(),
});

export const favoritesResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      propertyId: z.string(),
      property: favoritePropertySchema,
    }),
  ),
});

export const currencyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const toNumericPrice = (value: string | number): number =>
  typeof value === "number" ? value : Number(value);
