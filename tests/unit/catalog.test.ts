import { describe, it, expect } from "vitest";
import {
  priceFor,
  filterProducts,
  adjustStock,
  validatePromotion,
  publishSite,
} from "../../src/lib/catalog";
import type { DemoState, Product, Promotion } from "../../src/lib/types";
const product: Product = {
  id: "shirt",
  title: "Oxford shirt",
  slug: "oxford-shirt",
  description: "Cotton shirt",
  image: "/shirt.jpg",
  images: [],
  categoryIds: ["shirts"],
  collectionIds: ["essentials"],
  status: "published",
  attributes: { material: "Cotton", fit: "Regular" },
  createdAt: "2026-01-01",
  variants: [
    {
      id: "navy-s",
      sku: "S-NS",
      color: "Navy",
      size: "S",
      price: 8000,
      stock: 4,
    },
    {
      id: "white-m",
      sku: "S-WM",
      color: "White",
      size: "M",
      price: 10000,
      stock: 0,
    },
  ],
};
const promotion: Promotion = {
  id: "sale",
  title: "Summer sale",
  productIds: ["shirt"],
  kind: "percentage",
  amount: 25,
  enabled: true,
  startsAt: "2026-01-01T00:00:00Z",
  endsAt: "2027-01-01T00:00:00Z",
};
const now = new Date("2026-10-30T00:00:00Z");
describe("shared catalog behavior", () => {
  it("allows an archived product offer to be disabled", () =>
    expect(() =>
      validatePromotion(
        { ...promotion, enabled: false },
        [],
        [{ ...product, status: "archived" }],
      ),
    ).not.toThrow());
  it("applies active percentage pricing once everywhere", () =>
    expect(priceFor(product.variants[0], "shirt", [promotion], now)).toBe(
      6000,
    ));
  it("rounds a half-sen discount upwards", () =>
    expect(
      priceFor(
        { ...product.variants[0], price: 101 },
        "shirt",
        [{ ...promotion, amount: 50 }],
        now,
      ),
    ).toBe(50));
  it("ends promotions at the exact boundary", () =>
    expect(
      priceFor(
        product.variants[0],
        "shirt",
        [promotion],
        new Date(promotion.endsAt),
      ),
    ).toBe(8000));
  it("does not match options across different variants", () =>
    expect(
      filterProducts([product], [], { colors: ["Navy"], sizes: ["M"] }, now),
    ).toHaveLength(0));
  it("matches price and availability on the selected variant", () =>
    expect(
      filterProducts(
        [product],
        [],
        { colors: ["White"], max: 9000, inStock: true },
        now,
      ),
    ).toHaveLength(0));
  it("uses matching variant prices on cards", () =>
    expect(
      filterProducts([product], [promotion], { colors: ["Navy"] }, now)[0]
        .minPrice,
    ).toBe(6000));
  it("matches either choice within a descriptive attribute", () =>
    expect(
      filterProducts(
        [product],
        [],
        { attributes: { material: ["Cotton", "Linen"] } },
        now,
      ),
    ).toHaveLength(1));
  it("keeps a promotional shirt in its original category", () =>
    expect(
      filterProducts(
        [product],
        [promotion],
        { category: "shirts", promotional: true },
        now,
      ),
    ).toHaveLength(1));
  it("hides unpublished products", () =>
    expect(
      filterProducts([{ ...product, status: "draft" }], [], {}, now),
    ).toHaveLength(0));
  it("rejects negative resulting stock", () =>
    expect(() => adjustStock([product], "navy-s", -5)).toThrow(
      /negative|enough/i,
    ));
  it("rejects fractional stock adjustments", () =>
    expect(() => adjustStock([product], "navy-s", 1.5)).toThrow(
      /whole|integer/i,
    ));
  it("adjusts one variant without mutating the original", () => {
    const next = adjustStock([product], "navy-s", -2);
    expect(next[0].variants[0].stock).toBe(2);
    expect(product.variants[0].stock).toBe(4);
  });
  it("rejects overlapping promotions on the same product", () =>
    expect(() =>
      validatePromotion({ ...promotion, id: "new" }, [promotion], [product]),
    ).toThrow(/overlap/i));
  it("rejects a fixed discount larger than a variant price", () =>
    expect(() =>
      validatePromotion(
        { ...promotion, kind: "fixed", amount: 9000 },
        [],
        [product],
      ),
    ).toThrow(/price|discount/i));
  it("publishes an independent copy of the site draft", () => {
    const state = {
      siteDraft: { heroTitle: "New", sections: [], navigation: [] },
      sitePublished: { heroTitle: "Old" },
    } as unknown as DemoState;
    const next = publishSite(state);
    expect(next.sitePublished.heroTitle).toBe("New");
    expect(next.sitePublished).not.toBe(next.siteDraft);
    expect(state.sitePublished.heroTitle).toBe("Old");
  });
});
