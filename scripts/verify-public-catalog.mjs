import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000";
const state = await (await fetch(`${base}/api/store`)).json();
const catalog=await(await fetch(`${base}/api/catalog?q=Integration%20test%20shirt`)).json();
const p = catalog.matches.find((m) => m.product.slug === "integration-test-shirt")?.product;
assert(
  p,
  "The explicitly approved temporary test product must be published while this check runs.",
);
assert.equal(p.variants[0].price, 8000);
assert.equal(p.variants[0].effectivePrice, 6000);
assert.equal(p.variants[0].stock, 1);
assert.equal(state.data.adjustments.length, 0);
const image = await fetch(base + p.image, { redirect: "manual" });
assert.equal(image.status, 307);
assert(
  image.headers
    .get("location")
    ?.includes("/storage/v1/object/sign/catalog-media/"),
);
const bytes = await fetch(image.headers.get("location"));
assert.equal(bytes.status, 200);
assert(bytes.headers.get("content-type")?.includes("image/webp"));
const browser = await chromium.launch({
  channel: process.platform === "win32" ? "msedge" : undefined,
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  for (const path of ["/categories/shirts", "/promotions"]) {
    await page.goto(base + path);
    await page
      .getByRole("link", { name: "Integration test shirt", exact: true })
      .waitFor();
    assert(
      (await page.locator(".product-price").allTextContents()).some((p) =>
        p.includes("60.00"),
      ),
    );
  }
  await page.screenshot({
    path: ".cache/connected-promotions-desktop.png",
    fullPage: true,
  });
  await page.goto(base + "/products/integration-test-shirt");
  await page
    .getByRole("heading", { name: "Integration test shirt", exact: true })
    .waitFor();
  await page
    .locator(".product-gallery img")
    .first()
    .waitFor()
    .catch(() => {});
  assert(
    (await page.locator("body").innerText()).includes(
      "Available in this size and colour",
    ),
  );
  await page.screenshot({
    path: ".cache/connected-product-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".cache/connected-product-mobile.png",
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  console.log(
    "PASS: independent anonymous browser verifies category + promotion membership, MYR effective pricing, boolean availability, signed WebP delivery, and mobile layout.",
  );
} finally {
  await browser.close();
}
