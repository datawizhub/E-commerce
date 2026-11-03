import type {
  DemoState,
  Filters,
  Product,
  ProductMatch,
  Promotion,
  Variant,
} from "./types";
export const money = (value: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
    value / 100,
  );
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function activePromotion(
  id: string,
  promotions: Promotion[],
  now = new Date(),
) {
  return promotions.find(
    (p) =>
      p.enabled &&
      p.productIds.includes(id) &&
      (p.serverActive === true ||
        (Date.parse(p.startsAt) <= +now && +now < Date.parse(p.endsAt))),
  );
}
export function priceFor(
  variant: Variant,
  id: string,
  promotions: Promotion[],
  now = new Date(),
): number {
  if (variant.effectivePrice !== undefined) return variant.effectivePrice;
  const p = activePromotion(id, promotions, now);
  return p
    ? Math.max(
        0,
        variant.price -
          (p.kind === "fixed"
            ? p.amount
            : Math.round((variant.price * p.amount) / 100)),
      )
    : variant.price;
}
export function filterProducts(
  products: Product[],
  promotions: Promotion[],
  filters: Filters,
  now = new Date(),
): ProductMatch[] {
  const result: ProductMatch[] = [];
  for (const product of products) {
    if (
      product.status !== "published" ||
      (filters.category && !product.categoryIds.includes(filters.category)) ||
      (filters.collection &&
        !product.collectionIds.includes(filters.collection)) ||
      (filters.promotional && !activePromotion(product.id, promotions, now))
    )
      continue;
    if (
      filters.search &&
      !`${product.title} ${product.description}`
        .toLowerCase()
        .includes(filters.search.toLowerCase())
    )
      continue;
    if (
      Object.entries(filters.attributes ?? {}).some(
        ([key, choices]) =>
          choices.length &&
          !choices.some((c) =>
            (Array.isArray(product.attributes[key])
              ? product.attributes[key]
              : [String(product.attributes[key])]
            ).includes(c),
          ),
      )
    )
      continue;
    const variants = product.variants.filter(
      (v) =>
        (!filters.colors?.length || filters.colors.includes(v.color)) &&
        (!filters.sizes?.length || filters.sizes.includes(v.size)) &&
        (!filters.inStock || v.stock > 0) &&
        (filters.min === undefined ||
          priceFor(v, product.id, promotions, now) >= filters.min) &&
        (filters.max === undefined ||
          priceFor(v, product.id, promotions, now) <= filters.max),
    );
    if (!variants.length) continue;
    const prices = variants.map((v) =>
      priceFor(v, product.id, promotions, now),
    );
    const minPrice = Math.min(...prices);
    const first = variants[prices.indexOf(minPrice)];
    result.push({
      product,
      variants,
      minPrice,
      maxPrice: Math.max(...prices),
      regularPrice: first.price,
      onSale: prices.some((p, i) => p < variants[i].price),
      inStock: variants.some((v) => v.stock > 0),
    });
  }
  return result.sort((a, b) =>
    filters.sort === "price_asc"
      ? a.minPrice - b.minPrice
      : filters.sort === "price_desc"
        ? b.minPrice - a.minPrice
        : filters.sort === "title"
          ? a.product.title.localeCompare(b.product.title)
          : Date.parse(b.product.createdAt) - Date.parse(a.product.createdAt),
  );
}
export function adjustStock(
  products: Product[],
  variantId: string,
  delta: number,
): Product[] {
  if (!Number.isInteger(delta) || delta === 0)
    throw new Error("Enter a non-zero whole number.");
  const variant = products
    .flatMap((p) => p.variants)
    .find((v) => v.id === variantId);
  if (!variant) throw new Error("Variant no longer exists.");
  if (variant.stock + delta < 0)
    throw new Error("Not enough stock: the balance cannot be negative.");
  return products.map((p) => ({
    ...p,
    variants: p.variants.map((v) =>
      v.id === variantId ? { ...v, stock: v.stock + delta } : v,
    ),
  }));
}
export function validatePromotion(
  input: Promotion,
  existing: Promotion[],
  products: Product[],
): void {
  if (!input.title.trim() || !input.productIds.length)
    throw new Error("Enter a title and select at least one product.");
  const start = Date.parse(input.startsAt),
    end = Date.parse(input.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("End date must be after the start date.");
  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    (input.kind === "percentage" && input.amount > 100) ||
    (input.kind === "fixed" && !Number.isInteger(input.amount))
  )
    throw new Error(
      "Enter a valid positive discount; percentage cannot exceed 100.",
    );
  const selected = products.filter((p) => input.productIds.includes(p.id));
  if (
    selected.length !== input.productIds.length ||
    (input.enabled && selected.some((p) => p.status !== "published"))
  )
    throw new Error("Select published products only.");
  if (
    selected.some((p) =>
      p.variants.some((v) =>
        input.kind === "fixed"
          ? input.amount > v.price
          : Math.round((v.price * input.amount) / 100) < 1,
      ),
    )
  )
    throw new Error(
      "Discount must fit every variant price and save at least one sen.",
    );
  if (
    input.enabled &&
    existing.some(
      (p) =>
        p.id !== input.id &&
        p.enabled &&
        p.productIds.some((id) => input.productIds.includes(id)) &&
        Date.parse(p.startsAt) < end &&
        start < Date.parse(p.endsAt),
    )
  )
    throw new Error(
      "This promotion overlaps another enabled promotion for a selected product.",
    );
}
export function publishSite(state: DemoState): DemoState {
  return { ...state, sitePublished: structuredClone(state.siteDraft) };
}
export function validateProduct(p: Product, others: Product[]) {
  if (!p.title.trim() || !p.slug || slugify(p.slug) !== p.slug)
    throw new Error(
      "Enter a title and a URL slug using lowercase letters, numbers, and hyphens.",
    );
  if (others.some((o) => o.id !== p.id && o.slug === p.slug))
    throw new Error("This product URL is already in use.");
  if (!p.variants.length) throw new Error("Add at least one variant.");
  const seen = new Set<string>();
  const combinations = new Set<string>();
  for (const v of p.variants) {
    const sku = v.sku.trim().toLowerCase();
    const pair = `${v.color.trim().toLowerCase()}|${v.size.trim().toLowerCase()}`;
    if (!sku || !v.color.trim() || !v.size.trim())
      throw new Error("Every variant needs a SKU, colour, and size.");
    if (
      seen.has(sku) ||
      others.some(
        (o) =>
          o.id !== p.id && o.variants.some((x) => x.sku.toLowerCase() === sku),
      )
    )
      throw new Error("Each SKU must be unique.");
    if (combinations.has(pair))
      throw new Error("Each colour and size combination must be unique.");
    seen.add(sku);
    combinations.add(pair);
    if (
      !Number.isInteger(v.price) ||
      v.price <= 0 ||
      !Number.isInteger(v.stock) ||
      v.stock < 0
    )
      throw new Error(
        "Prices must be positive and stock must be a non-negative whole number.",
      );
  }
  if (p.status === "published" && (!p.image || !p.categoryIds.length))
    throw new Error(
      "Published products need an image and at least one category.",
    );
}
export function promotionStatus(p: Promotion, now = new Date()) {
  return !p.enabled
    ? "Disabled"
    : +now < Date.parse(p.startsAt)
      ? "Scheduled"
      : +now >= Date.parse(p.endsAt)
        ? "Ended"
        : "Active";
}
export function localDateTime(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(" ", "T");
}
export function fromLocalDateTime(value: string) {
  return new Date(`${value}:00+08:00`).toISOString();
}
