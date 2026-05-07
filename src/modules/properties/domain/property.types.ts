import type { PropertyType } from "@/generated/prisma/enums";

export interface PropertySearchFilters {
  query?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  sort?: "relevance" | "newest" | "priceAsc" | "priceDesc";
  page: number;
  pageSize: number;
}

export interface PropertySearchItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number | string;
  location: string;
  rooms: number;
}

export interface PropertySearchResult {
  data: PropertySearchItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PublicPropertyListQuery {
  page: number;
  limit: number;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface AdminPropertyCreateInput {
  title: string;
  description: string;
  location: string;
  price: number;
  rooms?: number;
  type: PropertyType;
  images: string[];
  ownerId?: string | null;
}

export interface CreatePropertyDTO {
  title: string;
  description?: string;
  location?: string;
  city: string;
  neighborhood?: string;
  price: number;
  rooms?: number;
  type: PropertyType;
  images?: string[];
}

export interface AdminPropertyUpdateInput {
  title?: string;
  description?: string;
  location?: string;
  price?: number;
  rooms?: number | null;
  type?: PropertyType;
  images?: string[];
  ownerId?: string | null;
}
