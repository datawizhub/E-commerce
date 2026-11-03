import { test, expect } from "@playwright/test";
test("browse, filter a real variant, inspect pricing, and search", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Everyday, but considered." }),
  ).toBeVisible();
  await page.goto("/categories/shirts?color=Navy&size=M");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-price")).toContainText("118.40");
  await page
    .locator(".product-info")
    .getByRole("link", { name: "The printed chambray", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "The printed chambray", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Size M", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".detail-price")).toContainText("118.40");
  await page.goto("/categories/shirts?color=Navy&size=M");
  await page.locator(".product-photo").click();
  await expect(
    page.getByRole("button", { name: "Size M", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Search products", exact: true })
    .click();
  await page.getByLabel("Search the collection", { exact: true }).fill("denim");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("Sold out");
  expect(errors).toEqual([]);
});
test("admin attributes, new published products, category and promotion share one catalog", async ({
  page,
}) => {
  await page.goto("/admin/attributes");
  await page
    .getByRole("button", { name: "Add attribute", exact: true })
    .click();
  await page.getByLabel("Label", { exact: true }).fill("Country of origin");
  await page
    .getByRole("button", { name: "Save attribute", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Attribute saved");
  await page.goto("/admin/products/new");
  await page
    .getByLabel("Product title", { exact: true })
    .fill("The local test shirt");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A new ready-stock shirt.");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("published");
  await page.getByLabel("SKU", { exact: true }).fill("TEST-SHIRT-N-M");
  await page.getByLabel("Colour", { exact: true }).fill("Navy");
  await page.getByLabel("Size", { exact: true }).fill("M");
  await page.getByLabel("Price (RM)", { exact: true }).fill("120");
  await page.getByLabel("Stock", { exact: true }).fill("3");
  await page.getByLabel("Shirts", { exact: true }).check();
  await page.getByLabel("Country of origin", { exact: true }).fill("Malaysia");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[a-f0-9-]+$/);
  await page.reload();
  await expect(
    page.getByLabel("Country of origin", { exact: true }),
  ).toHaveValue("Malaysia");
  await expect(page.getByLabel("Product title", { exact: true })).toHaveValue(
    "The local test shirt",
  );
  await page.goto("/admin/promotions");
  await page
    .getByRole("button", { name: "Create promotion", exact: true })
    .click();
  await page
    .getByLabel("Promotion name", { exact: true })
    .fill("Test shirt offer");
  await page.getByLabel("Percentage (%)", { exact: true }).fill("10");
  await page
    .getByLabel("Starts (Malaysia time)", { exact: true })
    .fill("2026-01-01T00:00");
  await page
    .getByLabel("Ends (Malaysia time)", { exact: true })
    .fill("2030-01-01T00:00");
  await page.getByLabel("The local test shirt", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save promotion", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Promotion saved");
  await page.goto("/promotions?q=local%20test");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-price")).toContainText("108.00");
  await page.goto("/categories/shirts?q=local%20test");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-price")).toContainText("108.00");
  await page.locator(".product-photo").click();
  await expect(page.locator(".details-list")).toContainText("Malaysia");
});
test("stock validation, draft preview, publish, and reset", async ({
  page,
}) => {
  await page.goto("/admin/inventory");
  const row = page.getByRole("row").filter({ hasText: "CF-1-1-S" });
  await row.getByRole("button", { name: "Adjust stock" }).click();
  await page
    .getByLabel("Adjustment (use a minus sign to remove stock)", {
      exact: true,
    })
    .fill("-999");
  await page.getByLabel("Reason", { exact: true }).fill("Testing validation");
  await page.getByRole("button", { name: "Save stock adjustment" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "negative",
  );
  await page
    .getByLabel("Adjustment (use a minus sign to remove stock)", {
      exact: true,
    })
    .fill("-4");
  await page.getByRole("button", { name: "Save stock adjustment" }).click();
  await expect(page.getByRole("status")).toContainText("Stock updated");
  await expect(row).toContainText("Out of stock");
  await page.goto("/products/the-everyday-tee");
  await expect(page.locator(".stock-status")).toContainText("Sold out");
  await page.goto("/admin/homepage");
  await page
    .getByRole("textbox", { name: "Hero title", exact: true })
    .fill("A fresh local preview.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Everyday,\nbut considered.");
  await page.goto("/preview");
  await expect(page.locator("h1")).toHaveText("A fresh local preview.");
  await page.goto("/admin/homepage");
  await expect(
    page.getByRole("textbox", { name: "Hero title", exact: true }),
  ).toHaveValue("A fresh local preview.");
  await page
    .getByRole("button", { name: "Publish locally", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Published");
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("A fresh local preview.");
  await page.goto("/admin");
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore sample data", exact: true })
    .click();
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Everyday,\nbut considered.");
});
test("mobile menu, filters, and keyboard dialog dismissal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Shirts", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("Shirts");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filter the collection" });
  await dialog.getByLabel("Navy", { exact: true }).click();
  await expect(dialog.getByLabel("Navy", { exact: true })).toBeChecked();
  await dialog.getByRole("button", { name: /Show \d pieces?/ }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Search products", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
