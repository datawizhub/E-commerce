"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowRight, SlidersHorizontal, Check, ArrowLeft } from "lucide-react";
import { useDemo } from "@/lib/store";
import {
  activePromotion,
  filterProducts,
  money,
  priceFor,
} from "@/lib/catalog";
import type { Filters, ProductMatch, CatalogResult } from "@/lib/types";
import { backendEnabled } from "@/lib/backend-contract";
import { catalogQueryKey, listingQuery } from "@/lib/catalog-query";
import { Empty, Modal, TextLink } from "./ui";
export function ProductCard({
  match,
  eager = false,
}: {
  match: ProductMatch;
  eager?: boolean;
}) {
  const { product, variants } = match;
  const detailHref = `/products/${product.slug}?variant=${encodeURIComponent(variants[0].id)}`;
  return (
    <article className="product-card">
      <Link href={detailHref} className="product-photo">
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 24vw"
          loading={eager ? "eager" : "lazy"}
          unoptimized
        />
        {!match.inStock ? (
          <span className="product-badge">Sold out</span>
        ) : match.onSale ? (
          <span className="product-badge sale">On offer</span>
        ) : null}
        <span className="photo-arrow">
          <ArrowRight size={19} />
        </span>
      </Link>
      <div className="product-info">
        <Link href={detailHref}>{product.title}</Link>
        <span className="product-price">
          {match.minPrice !== match.maxPrice ? "From " : ""}
          {money(match.minPrice)}{" "}
          {match.onSale && match.regularPrice > match.minPrice ? (
            <s>{money(match.regularPrice)}</s>
          ) : null}
        </span>
        <span className="muted product-colors">
          {[...new Set(variants.map((v) => v.color))].join(" / ")}
        </span>
      </div>
    </article>
  );
}
export function Home({ preview = false }: { preview?: boolean }) {
  const { data } = useDemo();
  const site = preview ? data.siteDraft : data.sitePublished;
  const headlineBreak = site.heroTitle.indexOf("\n");
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>
            {headlineBreak < 0 ? (
              site.heroTitle
            ) : (
              <>
                {site.heroTitle.slice(0, headlineBreak)}
                {"\n"}
                <span className="hero-accent">
                  {site.heroTitle.slice(headlineBreak + 1)}
                </span>
              </>
            )}
          </h1>
          <p>{site.heroBody}</p>
          <Link className="button" href={site.heroHref}>
            {site.heroButton}
            <ArrowRight size={18} />
          </Link>
          <span className="hero-footnote">
            A little intention. An everyday kind of style.
          </span>
        </div>
        <div className="hero-image">
          <Image
            src={site.heroImage}
            alt="Everyday layering in a soft blue coat"
            fill
            loading="eager"
            sizes="(max-width: 700px) 100vw, 55vw"
            unoptimized
          />
          <span className="image-caption">The everyday edit</span>
        </div>
      </section>
      <div className="category-strip">
        <span>Find your everyday</span>
        <div>
          {data.categories.map((c) => (
            <Link key={c.id} href={`/categories/${c.slug}`}>
              {c.title}
              <ArrowUpRightSmall />
            </Link>
          ))}
        </div>
      </div>
      {site.sections
        .filter((s) => s.enabled)
        .map((section) => {
          if (section.type === "image-text")
            return (
              <section className="editorial-section" key={section.id}>
                <div className="editorial-image">
                  <Image
                    src={section.image}
                    alt="Inside a considered clothing collection"
                    fill
                    sizes="(max-width:700px) 100vw, 50vw"
                    unoptimized
                  />
                </div>
                <div className="editorial-copy">
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                  <TextLink href={section.href}>Discover the edit</TextLink>
                </div>
              </section>
            );
          let items = filterProducts(data.products, data.promotions, {
            collection:
              section.type === "collection" ? section.collectionId : undefined,
            promotional: section.type === "promotions",
          });
          if (section.type === "products")
            items = items.filter((m) =>
              section.productIds.includes(m.product.id),
            );
          const href =
            section.type === "promotions"
              ? "/promotions"
              : section.type === "collection"
                ? `/collections/${data.collections.find((c) => c.id === section.collectionId)?.slug ?? ""}`
                : "/products";
          return (
            <section className="product-section" key={section.id}>
              <div className="section-title">
                <h2>{section.title}</h2>
                <TextLink href={href}>Explore all</TextLink>
              </div>
              {items.length ? (
                <div className="product-grid">
                  {items.slice(0, section.count).map((match) => (
                    <ProductCard key={match.product.id} match={match} />
                  ))}
                </div>
              ) : (
                <p className="muted">
                  This edit is coming together. Explore the full collection in
                  the meantime.
                </p>
              )}
            </section>
          );
        })}
    </>
  );
}
function ArrowUpRightSmall() {
  return <ArrowRight className="category-arrow" size={16} aria-hidden="true" />;
}
export function Collections() {
  const { data } = useDemo();
  return (
    <div className="page-wrap">
      <div className="listing-heading">
        <h1>The collections</h1>
        <p>A few ways to find your own rhythm.</p>
      </div>
      <div className="collection-grid">
        {data.collections.map((c) => (
          <Link
            key={c.id}
            href={`/collections/${c.slug}`}
            className="collection-card"
          >
            <div className="collection-photo">
              <Image
                src={c.image}
                alt={c.title}
                fill
                sizes="(max-width:700px) 100vw, 33vw"
                unoptimized
              />
            </div>
            <h2>
              {c.title}
              <ArrowRight size={21} />
            </h2>
            <p>{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
export function Listing({
  kind = "all",
  slug,
  initialResult,
}: {
  kind?: "all" | "category" | "collection" | "promotions";
  slug?: string;
  initialResult?: CatalogResult;
}) {
  const { data } = useDemo();
  const router = useRouter(),
    path = usePathname(),
    params = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const group = (kind === "category" ? data.categories : data.collections).find(
    (g) => g.slug === slug,
  );
  const get = (key: string) => params.getAll(key);
  const filters: Filters = {
    category:
      kind === "category" ? group?.id : (params.get("category") ?? undefined),
    collection: kind === "collection" ? group?.id : undefined,
    promotional: kind === "promotions",
    search: params.get("q") ?? undefined,
    colors: get("color"),
    sizes: get("size"),
    inStock: params.get("stock") === "1",
    min: params.has("min") ? Number(params.get("min")) * 100 : undefined,
    max: params.has("max") ? Number(params.get("max")) * 100 : undefined,
    sort: params.get("sort") ?? "newest",
    attributes: Object.fromEntries(
      data.attributes
        .filter((a) => a.filterable)
        .map((a) => [a.key, get(`attr_${a.key}`)]),
    ),
  };
  const queryKey = catalogQueryKey(
    listingQuery(new URLSearchParams(params), kind, slug),
  );
  const updating = backendEnabled && initialResult?.queryKey !== queryKey;
  const matches = backendEnabled
    ? (initialResult?.matches ?? [])
    : filterProducts(data.products, data.promotions, filters);
  const total = backendEnabled ? (initialResult?.total ?? 0) : matches.length;
  const page = initialResult?.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / 24));
  const scope = data.products.filter(
    (p) =>
      p.status === "published" &&
      (!filters.category || p.categoryIds.includes(filters.category)) &&
      (!filters.collection || p.collectionIds.includes(filters.collection)),
  );
  const update = (key: string, value: string, multiple = false) => {
    const next = new URLSearchParams(params);
    if (key !== "page") next.delete("page");
    if (multiple) {
      const values = next.getAll(key);
      next.delete(key);
      (values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value]
      ).forEach((v) => next.append(key, v));
    } else {
      next.delete(key);
      if (value) next.set(key, value);
    }
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const reset = () => router.replace(path, { scroll: false });
  const checkGroup = (title: string, key: string, values: string[]) =>
    values.length ? (
      <fieldset className="filter-group" key={key}>
        <legend>{title}</legend>
        {values.map((v) => (
          <label className="check" key={v}>
            <input
              type="checkbox"
              checked={get(key).includes(v)}
              onChange={() => update(key, v, true)}
            />
            {v}
          </label>
        ))}
      </fieldset>
    ) : null;
  const filterControls = (
    <>
      <div className="filter-title">
        <h2>Filter by</h2>
        <button className="text-button" onClick={reset}>
          Clear all
        </button>
      </div>
      {kind === "all" || kind === "promotions" ? (
        <label className="filter-group">
          Category
          <select
            value={filters.category ?? ""}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {checkGroup(
        "Size",
        "size",
        backendEnabled
          ? (initialResult?.facets.sizes.map((v) => v.value) ?? [])
          : [...new Set(scope.flatMap((p) => p.variants.map((v) => v.size)))],
      )}
      {checkGroup(
        "Colour",
        "color",
        backendEnabled
          ? (initialResult?.facets.colors.map((v) => v.value) ?? [])
          : [...new Set(scope.flatMap((p) => p.variants.map((v) => v.color)))],
      )}
      {data.attributes
        .filter(
          (a) =>
            a.filterable &&
            (backendEnabled ||
              !a.categoryIds.length ||
              scope.some((p) =>
                p.categoryIds.some((id) => a.categoryIds.includes(id)),
              )),
        )
        .map((a) =>
          backendEnabled && a.type === "number" ? (
            <fieldset className="filter-group" key={a.id}>
              <legend>
                {a.label}
                {a.unit ? ` (${a.unit})` : ""}
              </legend>
              <div className="price-inputs">
                <label>
                  Minimum
                  <input
                    type="number"
                    step="any"
                    value={params.get(`nmin_${a.key}`) ?? ""}
                    placeholder={String(
                      initialResult?.facets.attributes[a.key]?.min ?? "Any",
                    )}
                    onChange={(e) => update(`nmin_${a.key}`, e.target.value)}
                  />
                </label>
                <label>
                  Maximum
                  <input
                    type="number"
                    step="any"
                    value={params.get(`nmax_${a.key}`) ?? ""}
                    placeholder={String(
                      initialResult?.facets.attributes[a.key]?.max ?? "Any",
                    )}
                    onChange={(e) => update(`nmax_${a.key}`, e.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          ) : (
            checkGroup(
              a.label,
              `attr_${a.key}`,
              backendEnabled
                ? (initialResult?.facets.attributes[a.key]?.choices?.map(
                    (c) => c.value,
                  ) ?? [])
                : [
                    ...new Set(
                      scope.flatMap((p) => {
                        const v = p.attributes[a.key];
                        return v === undefined
                          ? []
                          : Array.isArray(v)
                            ? v
                            : [String(v)];
                      }),
                    ),
                  ],
            )
          ),
        )}
      <fieldset className="filter-group">
        <legend>Price (RM)</legend>
        <div className="price-inputs">
          <label>
            Minimum
            <input
              type="number"
              min="0"
              step="1"
              value={params.get("min") ?? ""}
              onChange={(e) => update("min", e.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            Maximum
            <input
              type="number"
              min="0"
              step="1"
              value={params.get("max") ?? ""}
              onChange={(e) => update("max", e.target.value)}
              placeholder="Any"
            />
          </label>
        </div>
      </fieldset>
      <label className="check">
        <input
          type="checkbox"
          checked={filters.inStock}
          onChange={(e) => update("stock", e.target.checked ? "1" : "")}
        />
        In stock only
      </label>
    </>
  );
  if ((kind === "category" || kind === "collection") && !group)
    return (
      <Empty
        title="This edit has moved"
        body="Find something new in the full collection."
      >
        <Link className="button" href="/products">
          Explore all pieces
        </Link>
      </Empty>
    );
  return (
    <div className="page-wrap">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>
          {group?.title ?? (kind === "promotions" ? "The offers" : "Shop all")}
        </span>
      </div>
      <div className="listing-heading">
        <h1>
          {filters.search
            ? `Results for “${filters.search}”`
            : (group?.title ??
              (kind === "promotions"
                ? "Good finds. A little less."
                : "The everyday collection"))}
        </h1>
        <p>
          {group?.description ??
            (kind === "promotions"
              ? "The same pieces you love, with a little something off."
              : "Easy to wear. Easy to make your own.")}
        </p>
      </div>
      <div className="listing-toolbar">
        <span aria-live="polite">
          {total} {total === 1 ? "piece" : "pieces"}
        </span>
        <button className="filter-toggle" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={17} />
          Filters
        </button>
        <label className="sort-label">
          Sort by
          <select
            aria-label="Sort products"
            value={filters.sort}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="newest">Newest additions</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="title">Name: A–Z</option>
          </select>
        </label>
      </div>
      <div className="catalog-layout">
        <aside className="filters" aria-label="Product filters">
          {filterControls}
        </aside>
        <div>
          {updating ? (
            <p role="status" className="empty">
              Updating the collection…
            </p>
          ) : matches.length ? (
            <div className="product-grid listing-grid">
              {matches.map((match, index) => (
                <ProductCard
                  key={match.product.id}
                  match={match}
                  eager={index < 3}
                />
              ))}
            </div>
          ) : (
            <Empty
              title="Nothing here just yet"
              body="Try a different combination or clear the filters to see all pieces."
            >
              <button className="button" onClick={reset}>
                Clear filters
              </button>
            </Empty>
          )}
          {backendEnabled && pages > 1 ? (
            <nav className="catalog-pagination" aria-label="Catalog pages">
              <button
                className="button secondary"
                disabled={page <= 1 || updating}
                onClick={() => update("page", String(page - 1))}
              >
                Previous
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button
                className="button secondary"
                disabled={page >= pages || updating}
                onClick={() => update("page", String(page + 1))}
              >
                Next
              </button>
            </nav>
          ) : null}
        </div>
      </div>
      <Modal
        title="Filter the collection"
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      >
        <div className="mobile-filters">{filterControls}</div>
        <button className="button full" onClick={() => setFiltersOpen(false)}>
          Show {total} {total === 1 ? "piece" : "pieces"}
        </button>
      </Modal>
    </div>
  );
}
export function ProductDetail({ slug }: { slug: string }) {
  const { data } = useDemo();
  const params = useSearchParams();
  const product = data.products.find(
    (p) => p.slug === slug && p.status === "published",
  );
  const [selected, setSelected] = useState(params.get("variant") ?? "");
  if (!product)
    return (
      <Empty
        title="This piece isn’t available"
        body="There’s more to discover in the collection."
      >
        <Link className="button" href="/products">
          Browse pieces
        </Link>
      </Empty>
    );
  const variant =
    product.variants.find((v) => v.id === selected) ?? product.variants[0];
  const price = priceFor(variant, product.id, data.promotions);
  const offer = activePromotion(product.id, data.promotions);
  const colors = [...new Set(product.variants.map((v) => v.color))];
  const related = filterProducts(data.products, data.promotions, {
    category: product.categoryIds[0],
  })
    .filter((m) => m.product.id !== product.id)
    .slice(0, 4);
  return (
    <div className="page-wrap">
      <Link className="back-link" href="/products">
        <ArrowLeft size={16} />
        Back to the collection
      </Link>
      <div className="product-detail">
        <div className="detail-gallery">
          {[product.image, ...product.images].map((image, i) => (
            <div className="detail-image" key={`${image}-${i}`}>
              <Image
                src={image}
                alt={`${product.title}${i ? " — additional view" : ""}`}
                fill
                loading={!i ? "eager" : "lazy"}
                sizes="(max-width:700px) 100vw, 55vw"
                unoptimized
              />
            </div>
          ))}
        </div>
        <div className="detail-copy">
          <h1>{product.title}</h1>
          <p className="detail-price">
            {money(price)}{" "}
            {price < variant.price ? <s>{money(variant.price)}</s> : null}
          </p>
          {offer ? (
            <p className="offer-note">
              {offer.kind === "percentage"
                ? `${offer.amount}% off`
                : `${money(offer.amount)} off`}{" "}
              · {offer.title}
            </p>
          ) : null}
          <p>{product.description}</p>
          <fieldset className="option-group">
            <legend>
              Colour <strong>{variant.color}</strong>
            </legend>
            <div className="option-buttons">
              {colors.map((color) => (
                <button
                  key={color}
                  className={variant.color === color ? "selected" : ""}
                  aria-pressed={variant.color === color}
                  onClick={() =>
                    setSelected(
                      (product.variants.find(
                        (v) => v.color === color && v.size === variant.size,
                      ) ?? product.variants.find((v) => v.color === color))!.id,
                    )
                  }
                >
                  {color}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="option-group">
            <legend>
              Size <strong>{variant.size}</strong>
            </legend>
            <div className="option-buttons">
              {product.variants
                .filter((v) => v.color === variant.color)
                .map((v) => (
                  <button
                    key={v.id}
                    className={`${variant.id === v.id ? "selected " : ""}${!v.stock ? "unavailable" : ""}`}
                    aria-pressed={variant.id === v.id}
                    aria-label={`Size ${v.size}${!v.stock ? ", sold out" : ""}`}
                    onClick={() => setSelected(v.id)}
                  >
                    {v.size}
                  </button>
                ))}
            </div>
          </fieldset>
          <p className={`stock-status ${variant.stock ? "" : "muted"}`}>
            {variant.stock ? (
              <>
                <Check size={16} />
                Available in this size and colour
              </>
            ) : (
              "Sold out in this size and colour"
            )}
          </p>
          <p className="prototype-note">
            Collection preview · purchasing will be available in a later phase.
          </p>
          <dl className="details-list">
            {data.attributes
              .filter(
                (a) =>
                  a.visible &&
                  (!a.categoryIds.length ||
                    a.categoryIds.some((id) =>
                      product.categoryIds.includes(id),
                    )) &&
                  product.attributes[a.key] !== undefined &&
                  product.attributes[a.key] !== "",
              )
              .map((a) => (
                <div key={a.id}>
                  <dt>{a.label}</dt>
                  <dd>
                    {Array.isArray(product.attributes[a.key])
                      ? (product.attributes[a.key] as string[]).join(", ")
                      : typeof product.attributes[a.key] === "boolean"
                        ? product.attributes[a.key]
                          ? "Yes"
                          : "No"
                        : String(product.attributes[a.key])}
                    {a.unit ? ` ${a.unit}` : ""}
                  </dd>
                </div>
              ))}
            <div>
              <dt>Product reference</dt>
              <dd>{variant.sku || product.slug}</dd>
            </div>
          </dl>
        </div>
      </div>
      {related.length ? (
        <section className="related">
          <div className="section-title">
            <h2>In good company.</h2>
            <TextLink href="/products">Explore more</TextLink>
          </div>
          <div className="product-grid">
            {related.map((match) => (
              <ProductCard match={match} key={match.product.id} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
