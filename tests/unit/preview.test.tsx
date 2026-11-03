import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { initialState } from "../../src/lib/seed";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/auth", () => ({
  requireAdmin: async () => ({ rpc: mocks.rpc }),
  StoreError: class extends Error {},
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/preview",
  useRouter: () => ({ refresh: vi.fn() }),
  redirect: vi.fn(),
}));
import PreviewPage from "../../src/app/preview/page";
it("renders draft navigation and draft body within the same authenticated preview", async () => {
  const state = structuredClone(initialState);
  state.siteDraft.navigation = [
    { id: "draft", label: "Draft-only navigation", href: "/products" },
  ];
  state.siteDraft.heroTitle = "Draft hero";
  state.sitePublished.navigation = [
    { id: "public", label: "Published navigation", href: "/products" },
  ];
  mocks.rpc.mockResolvedValue({
    data: { data: state, revision: 1 },
    error: null,
  });
  const html = renderToStaticMarkup(await PreviewPage());
  expect(html).toContain("Draft-only navigation");
  expect(html).toContain("Draft hero");
  expect(html).not.toContain("Published navigation");
});
