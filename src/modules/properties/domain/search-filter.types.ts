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

export interface SearchAlertCandidate {
  filterId: string;
  userId: string;
  userEmail: string;
  query: string | null;
  location: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: Date;
}
