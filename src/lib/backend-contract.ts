import type { DemoState } from "./types";
export const backendEnabled = process.env.NEXT_PUBLIC_STORE_MODE !== "demo" || process.env.NODE_ENV === 'production';
export function offerRefreshDelay(
  serverTime?: string,
  nextBoundary?: string | null,
  elapsed = 0,
) {
  if (!serverTime || !nextBoundary) return null;
  const delta = Date.parse(nextBoundary) - Date.parse(serverTime) - elapsed;
  return Number.isFinite(delta)
    ? Math.max(25, Math.min(2147483647, delta + 25))
    : null;
}
export function sameRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    const expected = new URL(request.url);
    const host = request.headers.get("host");
    if (host) expected.host = host;
    return (
      new URL(origin).origin === expected.origin &&
      origin === new URL(origin).origin
    );
  } catch {
    return false;
  }
}
export function safeAdminDestination(value: string | null): string {
  if (
    !value ||
    !/^\/admin(?:\/[^?#\\]*)?(?:\?[^#\\]*)?$/.test(value) ||
    value.includes("..") ||
    value.split("?")[0] === "/admin/login"
  )
    return "/admin";
  return value;
}
export function validateImageReference(value: string) {
  return (
    value === "" ||
    /^\/images\/[a-z0-9-]+\.(jpg|png|webp)$/.test(value) ||
    /^\/api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      value,
    )
  );
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
export type Mutation = {
  kind:
    | "product"
    | "category"
    | "collection"
    | "attribute"
    | "promotion"
    | "stock"
    | "site";
  payload: Record<string, unknown>;
};
export function buildMutation(before: DemoState, after: DemoState): Mutation {
  if (
    !same(before.siteDraft, after.siteDraft) ||
    !same(before.sitePublished, after.sitePublished)
  )
    return {
      kind: "site",
      payload: {
        site: after.siteDraft,
        publish: !same(before.sitePublished, after.sitePublished),
      },
    };
  if (after.adjustments.length > before.adjustments.length) {
    const change = after.adjustments.find(
      (a) => !before.adjustments.some((b) => b.id === a.id),
    );
    if (!change) throw new Error("Missing stock adjustment.");
    return {
      kind: "stock",
      payload: {
        id: change.id,
        variantId: change.variantId,
        delta: change.delta,
        reason: change.reason,
      },
    };
  }
  for (const [key, kind] of [
    ["categories", "category"],
    ["collections", "collection"],
    ["attributes", "attribute"],
    ["promotions", "promotion"],
    ["products", "product"],
  ] as const) {
    const changed = after[key].filter(
      (a) =>
        !same(
          a,
          before[key].find((b) => b.id === a.id),
        ),
    );
    if (!changed.length) continue;
    if (changed.length !== 1) throw new Error("Save one item at a time.");
    const payload: Record<string, unknown> = { ...changed[0] };
    if (kind === "category" || kind === "collection") {
      const memberKey = kind === "category" ? "categoryIds" : "collectionIds";
      payload.members = after.products
        .filter((p) => p[memberKey].includes(changed[0].id))
        .map((p) => p.id);
    }
    return { kind, payload };
  }
  // Membership-only saves can leave the group's descriptive fields unchanged.
  for (const [key, kind, memberKey] of [
    ["categories", "category", "categoryIds"],
    ["collections", "collection", "collectionIds"],
  ] as const) {
    for (const group of after[key]) {
      const members = (s: DemoState) =>
        s.products
          .filter((p) => p[memberKey].includes(group.id))
          .map((p) => p.id);
      if (!same(members(before), members(after)))
        return { kind, payload: { ...group, members: members(after) } };
    }
  }
  throw new Error("There are no changes to save.");
}
