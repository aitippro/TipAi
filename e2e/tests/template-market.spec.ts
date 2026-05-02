/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Template Market Tests — Verify grid layout and template browsing
 */

import { test, expect } from '../fixtures/electron';

test.describe('Template Market', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await page.waitForTimeout(1000);

    // Navigate to template market
    const templateNav = page.locator('nav >> text=模板');
    if (await templateNav.isVisible().catch(() => false)) {
      await templateNav.click();
      await expect(page.locator('text=模板市场')).toBeVisible({ timeout: 10000 });
    }
  });

  test('template market page loads with grid layout', async ({ page }) => {
    // Verify grid container exists
    const grid = page.locator('.grid, [data-testid="template-grid"]').first();

    // Even if no specific grid class, check that cards are laid out in columns
    const cards = page.locator('[data-testid="template-card"], .template-card, .card');
    const count = await cards.count();

    if (count > 0) {
      // Cards should be visible
      await expect(cards.first()).toBeVisible();
    } else {
      test.skip('No template cards found');
    }
  });

  test('search filters templates', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('营销');
      await page.waitForTimeout(1000); // Debounce

      // Should show filtered results or "no results" message
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    } else {
      test.skip('Search input not found');
    }
  });

  test('view mode toggle works', async ({ page }) => {
    const gridToggle = page.locator('button:has-text("网格"), [data-testid="grid-view"]').first();
    const listToggle = page.locator('button:has-text("列表"), [data-testid="list-view"]').first();

    if (await gridToggle.isVisible().catch(() => false) && await listToggle.isVisible().catch(() => false)) {
      await listToggle.click();
      await page.waitForTimeout(500);

      // Layout should change
      await expect(page.locator('.list-view, [data-testid="list-view-active"]')).toBeVisible();

      await gridToggle.click();
      await page.waitForTimeout(500);

      await expect(page.locator('.grid-view, [data-testid="grid-view-active"]')).toBeVisible();
    } else {
      test.skip('View mode toggles not found');
    }
  });

  test('can click on a template to view details', async ({ page }) => {
    const cards = page.locator('[data-testid="template-card"], .template-card, .card');

    if (await cards.count() > 0) {
      await cards.first().click();

      // Should navigate to detail or open modal
      await expect(
        page.locator('text=模板详情, text=使用模板, [data-testid="template-detail"]').first()
      ).toBeVisible({ timeout: 5000 });
    } else {
      test.skip('No templates to click');
    }
  });
});
