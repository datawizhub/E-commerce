import { z } from "zod";
const variant = z.object({
  id: z.string(),
  sku: z.string(),
  color: z.string(),
  size: z.string(),
  price: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  effectivePrice: z.number().int().nonnegative().optional(),
});
const product = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  image: z.string(),
  images: z.array(z.string()),
  categoryIds: z.array(z.string()),
  collectionIds: z.array(z.string()),
  status: z.enum(["draft", "published", "archived"]),
  attributes: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  ),
  variants: z.array(variant),
  createdAt: z.string(),
});
const group = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  image: z.string(),
});
const site = z.object({
  announcement: z.string(),
  heroTitle: z.string(),
  heroBody: z.string(),
  heroImage: z.string(),
  heroButton: z.string(),
  heroHref: z.string(),
  sections: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["collection", "promotions", "products", "image-text"]),
      title: z.string(),
      enabled: z.boolean(),
      count: z.number(),
      collectionId: z.string(),
      productIds: z.array(z.string()),
      image: z.string(),
      body: z.string(),
      href: z.string(),
    }),
  ),
  navigation: z.array(
    z.object({ id: z.string(), label: z.string(), href: z.string() }),
  ),
});
export const stateSchema = z.object({
  schemaVersion: z.literal(1),
  products: z.array(product),
  categories: z.array(group),
  collections: z.array(group),
  attributes: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      label: z.string(),
      type: z.enum(["text", "number", "boolean", "select", "multi"]),
      choices: z.array(z.string()),
      unit: z.string(),
      visible: z.boolean(),
      filterable: z.boolean(),
      categoryIds: z.array(z.string()),
    }),
  ),
  promotions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      productIds: z.array(z.string()),
      kind: z.enum(["percentage", "fixed"]),
      amount: z.number(),
      enabled: z.boolean(),
      serverActive: z.boolean().optional(),
      startsAt: z.string(),
      endsAt: z.string(),
    }),
  ),
  adjustments: z.array(
    z.object({
      id: z.string(),
      variantId: z.string(),
      productTitle: z.string(),
      variantLabel: z.string(),
      delta: z.number(),
      reason: z.string(),
      balance: z.number(),
      date: z.string(),
    }),
  ),
  siteDraft: site,
  sitePublished: site,
});
