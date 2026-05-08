import type {
  AdminPropertyCreateInput,
  AdminPropertyUpdateInput,
  CreatePropertyDTO,
  PublicPropertyCountQuery,
  PropertySearchFilters,
  PropertySearchResult,
  PublicPropertyListQuery,
} from "./property.types";
import type { PropertyStatus } from "@/generated/prisma/enums";

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
      isFeatured: boolean;
      featuredUntil: Date | null;
    }>;
  }>;
  countPublicProperties(query: PublicPropertyCountQuery): Promise<number>;
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
    isFeatured: boolean;
    featuredUntil: Date | null;
    sourceUrl: string | null;
    createdAt: Date;
    owner: { id: string; name: string | null; phone: string | null } | null;
  } | null>;
  getPropertyById(id: string): Promise<{
    id: string;
    title: string;
    description: string;
    images: string[];
    price: { toString(): string };
    location: string;
    city: string | null;
    neighborhood: string | null;
    rooms: number | null;
    type: string;
    isScraped: boolean;
    isFeatured: boolean;
    featuredUntil: Date | null;
    sourceUrl: string | null;
    status: PropertyStatus;
    createdAt: Date;
    ownerId: string | null;
    owner: { id: string; name: string | null; phone: string | null } | null;
  } | null>;
  listOwnerProperties(ownerId: string): Promise<Array<{
    id: string;
    title: string;
    description: string;
    location: string;
    price: { toString(): string };
    type: string;
    rooms: number | null;
    images: string[];
    isScraped: boolean;
    isFeatured: boolean;
    featuredUntil: Date | null;
    status: PropertyStatus;
    ownerId: string | null;
    createdAt: Date;
  }>>;
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
    isFeatured: boolean;
    featuredUntil: Date | null;
    status: PropertyStatus;
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
    isFeatured: boolean;
    featuredUntil: Date | null;
    status: PropertyStatus;
    ownerId: string | null;
    createdAt: Date;
  }>;
  createDirectProperty(data: CreatePropertyDTO, ownerId: string): Promise<{ id: string }>;
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
    isFeatured: boolean;
    featuredUntil: Date | null;
    status: PropertyStatus;
    ownerId: string | null;
    createdAt: Date;
  }>;
  markPropertyAsFeatured(
    id: string,
    featuredUntil: Date,
  ): Promise<{
    id: string;
    ownerId: string | null;
    isFeatured: boolean;
    featuredUntil: Date | null;
    updatedAt: Date;
  }>;
  updatePropertyStatus(
    id: string,
    status: PropertyStatus,
  ): Promise<{ id: string; status: PropertyStatus }>;
  deleteAdminProperty(id: string): Promise<void>;
  listPropertyOptions(): Promise<Array<{ id: string; title: string; location: string }>>;
}
