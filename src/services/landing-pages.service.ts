/**
 * Landing pages data service.
 *
 * Owns request shaping for the landing-pages list, editor, AI generation and
 * product picker. UI components import these functions instead of calling
 * `fetch` directly.
 */

import { apiFetch, withQuery } from "./http";
import type { Id } from "./types";

export type LandingPageStatus = "draft" | "published";

export interface LandingPageCustomizations {
  font?: string;
  colors?: Record<string, string>;
  sectionVisibility?: Record<string, boolean>;
  buttonStyle?: string;
}

export interface LandingPageListItem {
  id: Id;
  slug: string;
  title: string;
  status: LandingPageStatus;
  productName?: string | null;
  productId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LandingPage {
  id: Id;
  slug: string;
  title: string;
  storeId: string;
  generatedCode: string | null;
  status: LandingPageStatus;
  customizations: LandingPageCustomizations;
  createdAt: string;
  updatedAt: string;
}

/** Minimal product shape shared by the picker and the editor. */
export interface Product {
  id: Id;
  name: string;
  price: string;
  type?: string;
  slug?: string;
  images?: string[];
}

export interface LandingPagesResponse {
  landingPages: LandingPageListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
}

export interface LandingPageDetail {
  landingPage: LandingPage;
  product: Product | null;
}

export interface GenerateLandingPagePayload {
  productId: string;
  /**
   * Raw textarea content (one angle per line) or an already parsed array.
   * A string is normalized with `parseMarketingAngles`.
   */
  marketingAngles?: string | string[];
}

export interface GenerateLandingPageResponse {
  landingPage: LandingPage;
}

export interface UpdateLandingPagePayload {
  title?: string;
  slug?: string;
  generatedCode?: string | null;
  status?: LandingPageStatus;
  customizations?: LandingPageCustomizations;
}

export interface UpdateLandingPageResponse {
  landingPage: LandingPage;
}

export interface ListLandingPagesParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Turns the "one angle per line" textarea into the payload array: split on
 * newlines, drop blank lines, trim each remaining line.
 */
export function parseMarketingAngles(input: string): string[] {
  return input
    .split("\n")
    .filter((a) => a.trim())
    .map((a) => a.trim());
}

export async function list({
  page = 1,
  limit = 20,
  search,
}: ListLandingPagesParams = {}): Promise<LandingPagesResponse> {
  return apiFetch<LandingPagesResponse>(
    withQuery("/api/landing-pages", { page, limit, search }),
  );
}

export async function get(id: Id): Promise<LandingPageDetail> {
  return apiFetch<LandingPageDetail>(`/api/landing-pages/${id}`);
}

export async function generate({
  productId,
  marketingAngles,
}: GenerateLandingPagePayload): Promise<GenerateLandingPageResponse> {
  const angles =
    typeof marketingAngles === "string"
      ? parseMarketingAngles(marketingAngles)
      : marketingAngles;

  return apiFetch<GenerateLandingPageResponse>("/api/ai/generate-page", {
    method: "POST",
    body: { productId, marketingAngles: angles },
  });
}

export async function update(
  id: Id,
  patch: UpdateLandingPagePayload,
): Promise<UpdateLandingPageResponse> {
  return apiFetch<UpdateLandingPageResponse>(`/api/landing-pages/${id}`, {
    method: "PUT",
    body: patch,
  });
}

/**
 * The UI toggles visibility through `PUT /api/landing-pages/:id` with a
 * `{ status }` body, so these helpers wrap that exact call rather than the
 * dedicated publish/unpublish routes.
 */
export async function publish(id: Id): Promise<UpdateLandingPageResponse> {
  return update(id, { status: "published" });
}

export async function unpublish(id: Id): Promise<UpdateLandingPageResponse> {
  return update(id, { status: "draft" });
}

export async function remove(id: Id): Promise<void> {
  await apiFetch<{ success?: boolean }>(`/api/landing-pages/${id}`, {
    method: "DELETE",
  });
}

/**
 * Products that are not already linked to one of the landing pages currently
 * on screen.
 */
export async function listAvailableProducts(
  currentPages: Array<Pick<LandingPageListItem, "productId">>,
): Promise<Product[]> {
  const data = await apiFetch<ProductsResponse>("/api/products?limit=100");
  return data.products.filter(
    (p) => !currentPages.some((lp) => lp.productId === p.id),
  );
}

export const landingPagesService = {
  list,
  get,
  generate,
  update,
  publish,
  unpublish,
  remove,
  listAvailableProducts,
  parseMarketingAngles,
};
