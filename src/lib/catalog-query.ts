import { z } from "zod";
const slug = z
  .string()
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const values = z.array(z.string().min(1).max(200)).max(100);
const range = z.object({
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
});
const attributeKey = z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
export const catalogQuerySchema = z.object({
  category: z.uuid().optional(),
  collection: z.uuid().optional(),
  categorySlug: slug.optional(),
  collectionSlug: slug.optional(),
  promotional: z.boolean().optional(),
  search: z.string().max(300).optional(),
  colors: values.optional(),
  sizes: values.optional(),
  inStock: z.boolean().optional(),
  min: z.number().int().min(0).max(100000000).optional(),
  max: z.number().int().min(0).max(100000000).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "title"]).optional(),
  page: z.number().int().min(1).max(1000000).default(1),
  attributes: z.record(attributeKey, values).optional(),
  numeric: z.record(attributeKey, range).optional(),
});
export function catalogQueryKey(params: URLSearchParams) {
  const sorted = new URLSearchParams(params);
  sorted.sort();
  return sorted.toString();
}
export function listingQuery(
  params: URLSearchParams,
  kind = "all",
  slug?: string,
) {
  const query = new URLSearchParams(params);
  if (kind === "category" && slug) query.set("categorySlug", slug);
  if (kind === "collection" && slug) query.set("collectionSlug", slug);
  if (kind === "promotions") query.set("promotional", "1");
  return query;
}
export function parseCatalogQuery(params: URLSearchParams) {
  const attributes: Record<string, string[]> = Object.create(null),
    numeric: Record<string, { min?: number; max?: number }> =
      Object.create(null);
  if (params.size > 150) throw new Error("Too many catalog filters.");
  for (const key of new Set(params.keys())) {
    if (key.startsWith("attr_"))
      attributes[attributeKey.parse(key.slice(5))] = params.getAll(key);
    if (key.startsWith("nmin_") || key.startsWith("nmax_")) {
      const name = attributeKey.parse(key.slice(5));
      numeric[name] ??= {};
      numeric[name][key.startsWith("nmin_") ? "min" : "max"] = Number(
        params.get(key),
      );
    }
  }
  const text = (key: string) => params.get(key) || undefined;
  const price = (key: string) =>
    text(key) === undefined
      ? undefined
      : Math.round(Number(params.get(key)) * 100);
  return catalogQuerySchema.parse({
    category: text("category"),
    collection: text("collection"),
    categorySlug: text("categorySlug"),
    collectionSlug: text("collectionSlug"),
    promotional: params.get("promotional") === "1",
    search: text("q"),
    colors: params.getAll("color"),
    sizes: params.getAll("size"),
    inStock: params.get("stock") === "1",
    min: price("min"),
    max: price("max"),
    sort: text("sort"),
    page: params.has("page") ? Number(params.get("page")) : 1,
    attributes,
    numeric,
  });
}
