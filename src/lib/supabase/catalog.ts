import "server-only";
import { createSupabase } from "./server";
import { parseCatalogQuery, catalogQueryKey } from "../catalog-query";
import type { CatalogResult } from "../types";
import type { Json } from "./database.types";
export async function readCatalog(
  params: URLSearchParams,
): Promise<CatalogResult> {
  const filters = parseCatalogQuery(params);
  const { data, error } = await (
    await createSupabase()
  ).rpc("catalog_list", { query: filters as Json });
  if (error)
    throw new Error("The collection could not load. Please try again.");
  return {
    ...(data as unknown as CatalogResult),
    queryKey: catalogQueryKey(params),
  };
}
