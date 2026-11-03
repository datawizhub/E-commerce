import { z } from "zod";
import { stateSchema } from "./data-schema";
import { validateImageReference } from "./backend-contract";
const image = z
  .string()
  .max(150)
  .refine(validateImageReference, "Choose a bundled image or upload a photo.");
const uuid = z.uuid();
const group = stateSchema.shape.categories.element.extend({
  id: uuid,
  title: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().max(5000),
  image,
  members: z.array(uuid).max(10000),
});
const site = stateSchema.shape.siteDraft.extend({
  heroImage: image,
  sections: stateSchema.shape.siteDraft.shape.sections.max(20),
  navigation: stateSchema.shape.siteDraft.shape.navigation.max(12),
});
const payloads = {
  product: stateSchema.shape.products.element.extend({
    id: uuid,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(10000),
    image,
    images: z.array(image).max(20),
    categoryIds: z.array(uuid).max(100),
    collectionIds: z.array(uuid).max(100),
    variants: z
      .array(
        stateSchema.shape.products.element.shape.variants.element.extend({
          id: uuid,
          sku: z.string().trim().min(1).max(64),
          color: z.string().trim().min(1).max(100),
          size: z.string().trim().min(1).max(100),
          price: z.number().int().min(1).max(100000000),
        }),
      )
      .min(1)
      .max(200),
  }),
  category: group,
  collection: group,
  attribute: stateSchema.shape.attributes.element.extend({
    id: uuid,
    key: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
    label: z.string().trim().min(1).max(100),
    choices: z.array(z.string().trim().min(1).max(100)).max(100),
    unit: z.string().max(40),
    categoryIds: z.array(uuid).max(100),
  }),
  promotion: stateSchema.shape.promotions.element.extend({
    id: uuid,
    title: z.string().trim().min(1).max(200),
    productIds: z.array(uuid).min(1).max(10000),
    amount: z.number().positive().max(100000000),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
  }),
  stock: z.object({
    id: uuid,
    variantId: uuid,
    delta: z
      .number()
      .int()
      .min(-2147483647)
      .max(2147483647)
      .refine((n) => n !== 0),
    reason: z.string().trim().min(1).max(2000),
  }),
  site: z.object({ site, publish: z.boolean() }),
};
export const mutationSchema = z.object({
  kind: z.enum([
    "product",
    "category",
    "collection",
    "attribute",
    "promotion",
    "stock",
    "site",
  ]),
  payload: z.unknown(),
  expectedVersion: z.number().int().positive(),
  requestKey: uuid,
});
export function parseMutation(input: unknown) {
  const envelope = mutationSchema.parse(input);
  return {
    ...envelope,
    payload: payloads[envelope.kind].parse(envelope.payload),
  };
}
