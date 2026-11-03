export type AttributeValue = string | number | boolean | string[];
export type Variant = {
  id: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  effectivePrice?: number;
};
export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  images: string[];
  categoryIds: string[];
  collectionIds: string[];
  status: "draft" | "published" | "archived";
  attributes: Record<string, AttributeValue>;
  variants: Variant[];
  createdAt: string;
};
export type Group = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
};
export type AttributeDefinition = {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "multi";
  choices: string[];
  unit: string;
  visible: boolean;
  filterable: boolean;
  categoryIds: string[];
};
export type Promotion = {
  serverActive?: boolean;
  id: string;
  title: string;
  productIds: string[];
  kind: "percentage" | "fixed";
  amount: number;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
};
export type SiteSection = {
  id: string;
  type: "collection" | "promotions" | "products" | "image-text";
  title: string;
  enabled: boolean;
  count: number;
  collectionId: string;
  productIds: string[];
  image: string;
  body: string;
  href: string;
};
export type NavigationItem = { id: string; label: string; href: string };
export type SiteConfig = {
  announcement: string;
  heroTitle: string;
  heroBody: string;
  heroImage: string;
  heroButton: string;
  heroHref: string;
  sections: SiteSection[];
  navigation: NavigationItem[];
};
export type StockAdjustment = {
  id: string;
  variantId: string;
  productTitle: string;
  variantLabel: string;
  delta: number;
  reason: string;
  balance: number;
  date: string;
};
export type DemoState = {
  schemaVersion: 1;
  products: Product[];
  categories: Group[];
  collections: Group[];
  attributes: AttributeDefinition[];
  promotions: Promotion[];
  adjustments: StockAdjustment[];
  siteDraft: SiteConfig;
  sitePublished: SiteConfig;
};
export type Filters = {
  category?: string;
  collection?: string;
  promotional?: boolean;
  search?: string;
  colors?: string[];
  sizes?: string[];
  attributes?: Record<string, string[]>;
  min?: number;
  max?: number;
  inStock?: boolean;
  sort?: string;
};
export type ProductMatch = {
  product: Product;
  variants: Variant[];
  minPrice: number;
  maxPrice: number;
  regularPrice: number;
  onSale: boolean;
  inStock: boolean;
};
export type CatalogResult = {
  matches: ProductMatch[];
  total: number;
  page: number;
  pageSize: number;
  serverTime: string;
  nextBoundary: string | null;
  queryKey: string;
  facets: {
    colors: { value: string; count: number }[];
    sizes: { value: string; count: number }[];
    attributes: Record<
      string,
      {
        type: string;
        choices?: { value: string; count: number }[];
        min?: number | null;
        max?: number | null;
      }
    >;
  };
};
