import { test, expect } from "@playwright/test";
test("SSR listing paginates 24 products and applies numeric and colour filters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/products");
  await expect(page.locator(".product-card")).toHaveCount(24);
  await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(3);
  await expect(page).toHaveURL(/page=2/);
  const filters = page.getByRole("complementary", { name: "Product filters" });
  await filters
    .getByRole("group", { name: "Weight (g)", exact: true })
    .getByLabel("Minimum", { exact: true })
    .fill("25");
  await expect(page).toHaveURL(/nmin_weight=25/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.locator(".product-card")).toHaveCount(2);
  await filters.getByLabel("Navy", { exact: true }).click();
  await expect(filters.getByLabel("Navy", { exact: true })).toBeChecked();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-info")).toContainText("Mock shirt 26");
  await page.screenshot({
    path: ".cache/catalog-filter-verification.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("product detail omits hidden filterable attributes", async ({ page }) => {
  await page.goto("/products/mock-shirt-26");
  await expect(
    page.getByRole("heading", { name: "Mock shirt 26", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".details-list")).not.toContainText("Weight");
});
