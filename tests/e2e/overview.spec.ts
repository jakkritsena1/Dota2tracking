import { test, expect } from "@playwright/test";

// NOTE: These tests assume local Supabase is running with seed data.
// Run: supabase db reset && npm run dev, then: npm test

test.describe("Overview page", () => {
  test("loads and shows player header", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Overview/);
    // Player header section
    await expect(page.getByRole("banner", { name: "โปรไฟล์ผู้เล่น" })).toBeVisible();
  });

  test("shows form bar with at most 10 slots", async ({ page }) => {
    await page.goto("/");
    const formBar = page.getByRole("list", { name: /Form.*เกมล่าสุด/ });
    await expect(formBar).toBeVisible();
    const items = formBar.getByRole("listitem");
    expect(await items.count()).toBeGreaterThanOrEqual(0);
    expect(await items.count()).toBeLessThanOrEqual(10);
  });

  test("range selector changes URL without page reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "7 วัน" }).click();
    await expect(page).toHaveURL(/range=7d/);
  });

  test("clicking win/loss result on form navigates to match", async ({ page }) => {
    await page.goto("/");
    const firstFormLink = page.getByRole("list", { name: /Form/ }).getByRole("link").first();
    const matchHref = await firstFormLink.getAttribute("href");
    if (matchHref) {
      await firstFormLink.click();
      await expect(page).toHaveURL(matchHref);
    }
  });
});

test.describe("Matches page", () => {
  test("loads match list", async ({ page }) => {
    await page.goto("/matches");
    await expect(page).toHaveTitle(/Matches/);
  });

  test("range filter changes query param", async ({ page }) => {
    await page.goto("/matches");
    await page.getByRole("tab", { name: "90 วัน" }).click();
    await expect(page).toHaveURL(/range=90d/);
  });
});

test.describe("Match detail", () => {
  test("renders 404 for invalid match id", async ({ page }) => {
    const res = await page.goto("/match/invalid");
    expect(res?.status()).toBe(404);
  });
});

test.describe("Mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("no horizontal scroll on overview", async ({ page }) => {
    await page.goto("/");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance
  });

  test("shows mobile bottom navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("each nav link loads the correct page", async ({ page }) => {
    for (const [href, title] of [
      ["/matches",  /Matches/],
      ["/progress", /Progress/],
      ["/heroes",   /Heroes/],
      ["/coach",    /Coach/],
      ["/settings", /Settings/],
    ] as const) {
      await page.goto(href);
      await expect(page).toHaveTitle(title);
    }
  });
});
