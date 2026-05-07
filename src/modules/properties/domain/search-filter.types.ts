export interface SaveSearchFilterInput {
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  rooms?: number;
}

export interface UserSearchFilter {
  id: string;
  query: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  location: string | null;
  rooms: number | null;
  createdAt: Date;
  updatedAt: Date;
}
