import { expect, it } from "vitest";
import {
  parseCatalogQuery,
  listingQuery,
  catalogQueryKey,
} from "../../src/lib/catalog-query";
it("parses MYR prices, repeated selections, numeric zero and page numbers", () => {
  const q = parseCatalogQuery(
    new URLSearchParams(
      "min=60.25&color=Navy&color=Red&nmin_weight=0&nmax_weight=100&page=2",
    ),
  );
  expect(q.min).toBe(6025);
  expect(q.colors).toEqual(["Navy", "Red"]);
  expect(q.numeric?.weight).toEqual({ min: 0, max: 100 });
  expect(q.page).toBe(2);
  expect(
    catalogQueryKey(
      listingQuery(new URLSearchParams("q=shirt"), "category", "shirts"),
    ),
  ).toBe("categorySlug=shirts&q=shirt");
});
it("rejects malformed numeric filters and prototype keys without modifying shared objects", () => {
  try {
    expect(() =>
      parseCatalogQuery(new URLSearchParams("nmin___proto__=42")),
    ).toThrow();
    expect(Object.prototype).not.toHaveProperty("min");
  } finally {
    delete (Object.prototype as { min?: number }).min;
  }
  for (const q of ["min=NaN", "page=-1", "sort=invalid", "nmin_weight=abc"])
    expect(() => parseCatalogQuery(new URLSearchParams(q))).toThrow();
});
