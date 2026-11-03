import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const root = new URL("../.impeccable/review/", import.meta.url);
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ reducedMotion: "reduce" });
const errors = [],
  failures = [];
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("requestfailed", (r) =>
  failures.push(`${r.url()} ${r.failure()?.errorText}`),
);
const captures = [
  ["desktop", "/", 1440, 1000],
  ["mobile", "/", 390, 844],
  ["catalog-desktop", "/products", 1440, 1000],
  ["catalog-mobile", "/products", 390, 844],
  ["product-desktop", "/products/the-printed-chambray", 1440, 1000],
  ["product-mobile", "/products/the-printed-chambray", 390, 844],
  ["admin-desktop", "/admin", 1440, 1000],
  ["admin-mobile", "/admin", 390, 844],
  ["editor-mobile", "/admin/products/p1", 390, 844],
  ["homepage-editor-mobile", "/admin/homepage", 390, 844],
  ["products-admin-desktop", "/admin/products", 1440, 1000],
];
const report = [];
for (const [name, path, width, height] of captures) {
  await page.setViewportSize({ width, height });
  await page.goto(`http://127.0.0.1:3000${path}`);
  await page.locator("h1").waitFor();
  if (!path.startsWith("/admin"))
    await page.locator('main[data-ready="true"]').waitFor();
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (
      let top = 0;
      top < document.documentElement.scrollHeight;
      top += innerHeight
    ) {
      window.scrollTo({ top, behavior: "instant" });
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((img) => {
        const probe = new window.Image();
        probe.src = img.src;
        return probe.decode().catch(() => {});
      }),
    );
  });
  await page.screenshot({
    path: new URL(`${name}.png`, root).pathname.slice(1),
    fullPage: true,
    caret: "initial",
  });
  report.push({
    name,
    path,
    width,
    height,
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    images: await page.evaluate(() =>
      [...document.images]
        .filter((i) => i.getClientRects().length)
        .every((i) => i.complete && i.naturalWidth > 0),
    ),
    font: await page.evaluate(() => ({
      family: getComputedStyle(document.body).fontFamily,
      loaded: [...document.fonts]
        .filter((f) => f.status === "loaded")
        .map((f) => f.family),
    })),
  });
}
for (const width of [320, 375, 768, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  for (const path of [
    "/",
    "/products",
    "/admin/homepage",
    "/admin/products/p1",
  ]) {
    await page.goto(`http://127.0.0.1:3000${path}`);
    await page.locator("h1").waitFor();
    report.push({
      path,
      width,
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    });
  }
}
await writeFile(
  new URL("browser-report.json", root),
  JSON.stringify({ captures: report, errors, failures }, null, 2),
);
console.log(JSON.stringify({ captures: report, errors, failures }, null, 2));
await browser.close();
