import { describe, expect, it } from "vitest";
import {
  buildMutation,
  safeAdminDestination,
  validateImageReference,
  sameRequestOrigin,
  offerRefreshDelay,
} from "../../src/lib/backend-contract";
import { initialState } from "../../src/lib/seed";
import { activePromotion } from "../../src/lib/catalog";

describe("backend boundary", () => {
  it("schedules an offer boundary using server elapsed time rather than the visitor clock", () => {
    expect(
      offerRefreshDelay("2026-11-02T00:00:00Z", "2026-11-02T00:00:05Z", 1000),
    ).toBe(4025);
    expect(offerRefreshDelay("2026-11-02T00:00:00Z", null)).toBeNull();
  });
  it("uses database-evaluated offers even when the visitor clock is wrong", () => {
    const offer = { ...initialState.promotions[0], serverActive: true };
    expect(
      activePromotion(offer.productIds[0], [offer], new Date("1990-01-01")),
    ).toEqual(offer);
  });
  it("uses the browser-facing Host when Next.js rewrites its internal URL", () => {
    expect(
      sameRequestOrigin(
        new Request("http://localhost:3000/api/auth/login", {
          headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).toBe(true);
    for (const origin of [
      "https://evil.test",
      "null",
      "http://127.0.0.1:3001",
      "https://127.0.0.1:3000",
    ])
      expect(
        sameRequestOrigin(
          new Request("http://localhost:3000/api/auth/login", {
            headers: { host: "127.0.0.1:3000", origin },
          }),
        ),
      ).toBe(false);
    expect(
      sameRequestOrigin(new Request("http://localhost:3000/api/auth/login")),
    ).toBe(false);
  });
  it("sends one changed product rather than the entire store", () => {
    const before = structuredClone(initialState);
    const after = structuredClone(before);
    after.products[0].title = "Updated title";
    const change = buildMutation(before, after);
    expect(change.kind).toBe("product");
    expect(change.payload.id).toBe(before.products[0].id);
    expect(change.payload).not.toHaveProperty("products");
  });
  it("saves a group and its selected members as one operation", () => {
    const before = structuredClone(initialState),
      after = structuredClone(before);
    after.categories[0].title = "New category title";
    expect(buildMutation(before, after).kind).toBe("category");
    expect(buildMutation(before, after).payload).toHaveProperty("members");
  });
  it("rejects unsupported multi-entity changes", () => {
    const after = structuredClone(initialState);
    after.products[0].title = "One";
    after.products[1].title = "Two";
    expect(() => buildMutation(initialState, after)).toThrow(/one/i);
  });
  it("keeps post-login destinations within the protected workspace", () => {
    for (const bad of [
      "https://evil.test",
      "//evil.test",
      "/administer",
      "/admin/login",
      "/admin/../products",
      "/admin\\evil",
    ])
      expect(safeAdminDestination(bad)).toBe("/admin");
    expect(safeAdminDestination("/admin/products/new")).toBe(
      "/admin/products/new",
    );
  });
  it("accepts only managed media or bundled images", () => {
    expect(validateImageReference("/images/oxford.jpg")).toBe(true);
    expect(
      validateImageReference("/api/media/00000000-0000-4000-8000-000000000001"),
    ).toBe(true);
    for (const bad of [
      "data:image/svg+xml,x",
      "https://evil.test/x.jpg",
      "/images/../secret",
      "javascript:alert(1)",
    ])
      expect(validateImageReference(bad)).toBe(false);
  });
});
