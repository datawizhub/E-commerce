import { test, expect } from "@playwright/test";
import path from "node:path";
test("curated collection, image upload, and navigation publishing persist", async ({
  page,
}) => {
  await page.goto("/admin/collections");
  await page
    .getByRole("button", { name: "Add collection", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("The local edit");
  await dialog
    .getByRole("checkbox", { name: "The city coat", exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Save collection", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.goto("/collections/the-local-edit");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("The city coat");
  await page.goto("/admin/products/p1");
  await page
    .getByLabel("Upload a product photo", { exact: true })
    .setInputFiles(path.resolve("public/images/white-tee.jpg"));
  await expect(page.locator(".image-picker-preview")).toHaveAttribute(
    "src",
    /^data:image\/jpeg/,
  );
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Product saved");
  await page.reload();
  await expect(page.locator(".image-picker-preview")).toHaveAttribute(
    "src",
    /^data:image\/jpeg/,
  );
  await page.goto("/admin/navigation");
  await page
    .getByRole("textbox", { name: "Label", exact: true })
    .first()
    .fill("Browse pieces");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Browse pieces", exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin/navigation");
  await page
    .getByRole("button", { name: "Publish locally", exact: true })
    .click();
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Browse pieces", exact: true }),
  ).toBeVisible();
});
test("invalid saved data falls back to samples and can be reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("common-form-demo-v1", '{"schemaVersion":999}'),
  );
  await page.reload();
  await expect(page.locator(".feedback.error")).toContainText(
    "Saved demo data could not be read",
  );
  await expect(page.locator(".hero h1")).toContainText("Everyday");
  await page.goto("/admin");
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore sample data", exact: true })
    .click();
  await expect(page.locator(".feedback.error")).toHaveCount(0);
});
