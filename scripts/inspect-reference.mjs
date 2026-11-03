import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = new URL("../.impeccable/reference/nomu/", import.meta.url);
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: [
    "--host-resolver-rules=MAP nomu.store 216.150.1.1, MAP www.nomu.store 216.150.1.1",
  ],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
await page.goto("https://nomu.store/", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: new URL("desktop.png", dir).pathname.slice(1) });
const report = await page.evaluate(() => {
  const summarize = (e) => {
    const c = getComputedStyle(e);
    return {
      tag: e.tagName,
      text: e.textContent.trim().slice(0, 100),
      font: c.fontFamily,
      size: c.fontSize,
      weight: c.fontWeight,
      lineHeight: c.lineHeight,
      tracking: c.letterSpacing,
      color: c.color,
      background: c.backgroundColor,
      radius: c.borderRadius,
      padding: c.padding,
      border: c.border,
      box: e.getBoundingClientRect().toJSON(),
    };
  };
  const counts = (prop) =>
    Object.entries(
      [...document.querySelectorAll("body *")].reduce((map, e) => {
        const v = getComputedStyle(e)[prop];
        map[v] = (map[v] ?? 0) + 1;
        return map;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16);
  return {
    title: document.title,
    headings: [...document.querySelectorAll("h1,h2,h3")].map(summarize),
    elements: [...document.querySelectorAll("header,nav,button,a,p")]
      .slice(0, 40)
      .map(summarize),
    colors: counts("color"),
    backgrounds: counts("backgroundColor"),
    fonts: [...document.fonts].map((f) => ({
      family: f.family,
      weight: f.weight,
      status: f.status,
    })),
    fontResources: performance
      .getEntriesByType("resource")
      .filter((r) => /woff|ttf|otf/.test(r.name))
      .map((r) => r.name),
    stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(
      (e) => e.href,
    ),
    fontFaces: [...document.styleSheets].flatMap((s) => {
      try {
        return [...s.cssRules]
          .filter((r) => r.cssText.startsWith("@font-face"))
          .map((r) => r.cssText);
      } catch {
        return [];
      }
    }),
  };
});
await writeFile(new URL("styles.json", dir), JSON.stringify(report, null, 2));
await page.evaluate(() => window.scrollTo(0, innerHeight));
await page.waitForTimeout(600);
await page.screenshot({ path: new URL("section.png", dir).pathname.slice(1) });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("https://nomu.store/", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.screenshot({ path: new URL("mobile.png", dir).pathname.slice(1) });
console.log(
  JSON.stringify(
    {
      fonts: report.fonts,
      fontResources: report.fontResources,
      backgrounds: report.backgrounds,
      headings: report.headings.slice(0, 5),
      fontFaces: report.fontFaces,
    },
    null,
    2,
  ),
);
await browser.close();
