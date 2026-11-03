// Local-only HTTP fixture for exercising Next.js SSR pagination/filter controls.
// This process never connects to the hosted Supabase project.
import http from "node:http";
import { initialState } from "../src/lib/seed.ts";
import { filterProducts } from "../src/lib/catalog.ts";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const category = {
  id: id(1),
  title: "Shirts",
  slug: "shirts",
  description: "Test collection",
  image: "/images/oxford.jpg",
};
const products = Array.from({ length: 27 }, (_, n) => ({
  id: id(100 + n),
  title: `Mock shirt ${String(n).padStart(2, "0")}`,
  slug: `mock-shirt-${n}`,
  description: "Local test fixture",
  image: "/images/oxford.jpg",
  images: [],
  categoryIds: [category.id],
  collectionIds: [],
  status: "published",
  createdAt: new Date(2026, 0, 27 - n).toISOString(),
  attributes: { weight: n },
  variants: [
    {
      id: id(200 + n),
      sku: "",
      color: n % 2 ? "Red" : "Navy",
      size: "M",
      price: 8000,
      stock: 1,
      effectivePrice: 8000,
    },
  ],
}));
const site = {
  ...initialState.sitePublished,
  sections: [],
  navigation: [{ id: "shop", label: "Shop", href: "/products" }],
};
const state = {
  schemaVersion: 1,
  products: [],
  categories: [category],
  collections: [],
  attributes: [
    {
      id: id(2),
      key: "weight",
      label: "Weight",
      type: "number",
      unit: "g",
      visible: false,
      filterable: true,
      categoryIds: [],
      choices: [],
    },
  ],
  promotions: [],
  adjustments: [],
  siteDraft: site,
  sitePublished: site,
};
http
  .createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length
      ? JSON.parse(Buffer.concat(chunks).toString())
      : {};
    let data;
    const stamp = { serverTime: new Date().toISOString(), nextBoundary: null };
    if (req.url === "/rest/v1/rpc/store_snapshot")
      data = { ...stamp, data: state, revision: 0 };
    else if (req.url === "/rest/v1/rpc/product_snapshot")
      data = {
        ...stamp,
        data: {
          ...state,
          products: products.filter((p) => p.slug === body.slug),
        },
        revision: 0,
      };
    else if (req.url === "/rest/v1/rpc/catalog_list") {
      const f = body.query ?? {},
        range = f.numeric?.weight ?? {};
      const selected = products.filter(
        (p) =>
          (range.min === undefined || p.attributes.weight >= range.min) &&
          (range.max === undefined || p.attributes.weight <= range.max),
      );
      const matches = filterProducts(selected, [], f);
      const page = f.page ?? 1;
      data = {
        ...stamp,
        matches: matches.slice((page - 1) * 24, page * 24),
        total: matches.length,
        page,
        pageSize: 24,
        facets: {
          sizes: [{ value: "M", count: selected.length }],
          colors: [
            {
              value: "Navy",
              count: selected.filter((p) => p.variants[0].color === "Navy")
                .length,
            },
            {
              value: "Red",
              count: selected.filter((p) => p.variants[0].color === "Red")
                .length,
            },
          ],
          attributes: { weight: { type: "number", min: 0, max: 26 } },
        },
      };
    } else if (req.url === "/health") data = { ok: true };
    else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No fixture" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  })
  .listen(54329, "127.0.0.1");
