import { afterEach, expect, it, vi } from "vitest";
import { initialState } from "../../src/lib/seed";
import { commit, hydrateStore } from "../../src/lib/store";
afterEach(() => vi.unstubAllGlobals());
it("treats an acknowledged write as saved even when refreshing fails", async () => {
  hydrateStore({ data: structuredClone(initialState), revision: 1 }, "admin");
  const request = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ saved: { revision: 2 }, snapshot: null }), {
        status: 200,
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unavailable" }), { status: 503 }),
    );
  vi.stubGlobal("fetch", request);
  await expect(
    commit((s) => ({
      ...s,
      products: s.products.map((p, i) =>
        i ? p : { ...p, title: "Saved title" },
      ),
    })),
  ).resolves.toBeUndefined();
  expect(request).toHaveBeenCalledTimes(2);
});
it("reuses a stock request identity after an uncertain network failure", async () => {
  hydrateStore({ data: structuredClone(initialState), revision: 1 }, "admin");
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error("Network disconnected"))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          saved: { revision: 2 },
          snapshot: { data: initialState, revision: 2 },
        }),
        { status: 200 },
      ),
    );
  vi.stubGlobal("fetch", request);
  const update = (s: typeof initialState) => ({
    ...s,
    adjustments: [
      {
        id: crypto.randomUUID(),
        variantId: s.products[0].variants[0].id,
        productTitle: "Test",
        variantLabel: "Test",
        delta: 1,
        reason: "test receipt",
        balance: 1,
        date: new Date().toISOString(),
      },
      ...s.adjustments,
    ],
  });
  await expect(commit(update)).rejects.toThrow("Network disconnected");
  await commit(update);
  const first = JSON.parse(request.mock.calls[0][1].body),
    retry = JSON.parse(request.mock.calls[1][1].body);
  expect(retry).toEqual(first);
});
