import type {
  AdminPropertyCreateInput,
  AdminPropertyUpdateInput,
  PropertySearchFilters,
  PropertySearchResult,
  PublicPropertyListQuery,
} from "./property.types";

export interface PropertiesRepository {
  searchProperties(filters: PropertySearchFilters): Promise<PropertySearchResult>;
  listPublicProperties(query: PublicPropertyListQuery): Promise<{
    total: number;
    items: Array<{
      id: string;
      title: string;
      description: string;
      images: string[];
      price: { toString(): string };
      location: string;
      rooms: number | null;
      type: string;
    }>;
  }>;
  getPublicPropertyById(id: string): Promise<{
    id: string;
    title: string;
    description: string;
    images: string[];
    price: { toString(): string };
    location: string;
    rooms: number | null;
    type: string;
    isScraped: boolean;
    createdAt: Date;
    owner: { id: string; name: string | null } | null;
  } | null>;
  getPropertyById(id: string): Promise<{
    id: string;
    title: string;
    description: string;
    images: string[];
    price: { toString(): string };
    location: string;
    rooms: number | null;
    type: string;
    isScraped: boolean;
    createdAt: Date;
    ownerId: string | null;
  } | null>;
  listAdminProperties(): Promise<Array<{
    id: string;
    title: string;
    description: string;
    location: string;
    price: { toString(): string };
    type: string;
    rooms: number | null;
    images: string[];
    isScraped: boolean;
    ownerId: string | null;
    createdAt: Date;
    owner: { id: string; name: string | null; email: string } | null;
  }>>;
  createAdminProperty(input: AdminPropertyCreateInput): Promise<{
    id: string;
    title: string;
    description: string;
    location: string;
    price: { toString(): string };
    type: string;
    rooms: number | null;
    images: string[];
    isScraped: boolean;
    ownerId: string | null;
    createdAt: Date;
  }>;
  updateAdminProperty(id: string, input: AdminPropertyUpdateInput): Promise<{
    id: string;
    title: string;
    description: string;
    location: string;
    price: { toString(): string };
    type: string;
    rooms: number | null;
    images: string[];
    isScraped: boolean;
    ownerId: string | null;
    createdAt: Date;
  }>;
  deleteAdminProperty(id: string): Promise<void>;
  listPropertyOptions(): Promise<Array<{ id: string; title: string; location: string }>>;
}
