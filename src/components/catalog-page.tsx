import { Suspense } from "react";
import { Listing } from "./catalog-ui";
import { backendEnabled } from "@/lib/backend-contract";
import { listingQuery } from "@/lib/catalog-query";
import { readCatalog } from "@/lib/supabase/catalog";
export async function CatalogPage({
  kind = "all",
  slug,
  searchParams,
}: {
  kind?: "all" | "category" | "collection" | "promotions";
  slug?: string;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(
    searchParams ? await searchParams : {},
  )) {
    for (const part of Array.isArray(value)
      ? value
      : value === undefined
        ? []
        : [value])
      params.append(key, part);
  }
  let initial;
  if (backendEnabled) {
    try {
      initial = await readCatalog(listingQuery(params, kind, slug));
    } catch {
      return (
        <div className="page-wrap">
          <h1>The collection could not load.</h1>
          <p>Check the filters or reload to try again.</p>
        </div>
      );
    }
  }
  return (
    <Suspense fallback={<p className="empty">Opening the collection…</p>}>
      <Listing kind={kind} slug={slug} initialResult={initial} />
    </Suspense>
  );
}
