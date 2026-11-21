/** Shared primitive types for the client-facing service layer. */

export type Id = string;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
