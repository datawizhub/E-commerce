import { test, expect } from "@playwright/test";
test("public catalog is persistent while administration and preview require a session", async ({
  page,
  request,
}) => {
  const state = await request.get("/api/store");
  expect(state.status()).toBe(200);
  expect(state.headers()["cache-control"]).toContain("no-store");
  const body = await state.json();
  expect(body.data.adjustments).toEqual([]);
  expect(
    body.data.products.every(
      (p: { status: string }) => p.status === "published",
    ),
  ).toBe(true);
  expect(
    body.data.products
      .flatMap((p: { variants: { stock: number }[] }) => p.variants)
      .every((v: { stock: number }) => v.stock === 0 || v.stock === 1),
  ).toBe(true);
  expect((await request.get("/api/store?admin=1")).status()).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.goto("/preview");
  await expect(page).toHaveURL(/\/login\?/);
});
test("mutations reject external origins and missing administrator sessions", async ({
  request,
}) => {
  const external = await request.post("/api/admin/mutate", {
    headers: { Origin: "https://evil.example" },
    data: {},
  });
  expect(external.status()).toBe(403);
  const unauthenticated = await request.post("/api/admin/mutate", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: {},
  });
  expect(unauthenticated.status()).toBe(401);
  const malformedLogin = await request.post("/api/auth/login", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: {},
  });
  expect(malformedLogin.status()).toBe(400);
  expect(
    (
      await request.get("/api/media/00000000-0000-4000-8000-000000000099")
    ).status(),
  ).toBe(404);
});
test("login renders on mobile without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".cache/backend-login-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".cache/backend-login-desktop.png",
    fullPage: true,
  });
});
