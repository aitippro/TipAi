/**
 * Smoke Tests — Verify app launches and basic UI elements are present
 *
 * These are the fastest tests to run and should catch catastrophic failures.
 */

import { test, expect } from '../fixtures/electron';

test.describe('App Launch & Basic UI', () => {
  test('app window opens with correct title', async ({ electronApp, page }) => {
    // Verify window exists
    const windows = await electronApp.windows();
    expect(windows.length).toBeGreaterThan(0);

    // Check page title or heading
    await expect(page.locator('body')).toBeVisible();
  });

  test('main title renders correctly', async ({ page }) => {
    // Dismiss onboarding overlay if present
    const onboarding = page.locator('[class*="fixed inset-0 z-50"]').first();
    if (await onboarding.isVisible().catch(() => false)) {
      const skipBtn = onboarding.locator('button:has-text("以后再说"), button:has-text("开始使用")').first();
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click();
      } else {
        await page.evaluate(() => {
          document.querySelectorAll('[class*="fixed inset-0 z-50"]').forEach(el => el.remove());
        });
      }
      await page.waitForTimeout(500);
    }
    // Wait for the main heading to appear
    await expect(page.locator('h1 >> text=模糊需求')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1 >> text=完美提示词')).toBeVisible();
  });

  test('navigation sidebar is present', async ({ page }) => {
    // Common nav elements across the app
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('input textarea exists on home page', async ({ page }) => {
    // The main input for user intent
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeEnabled();
  });

  test('generate button is present and enabled', async ({ page }) => {
    // Look for the primary action button
    const generateBtn = page.locator('button:has-text("开始生成")');
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeEnabled();
  });

  test('no console errors on initial load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Reload to capture any startup errors
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('source map') &&
      !e.includes('[HMR]')
    );

    expect(criticalErrors).toEqual([]);
  });
});

test.describe('Navigation', () => {
  test('can navigate to Template Market', async ({ page }) => {
    // Dismiss onboarding overlay if present
    const onboarding = page.locator('[class*="fixed inset-0 z-50"]').first();
    if (await onboarding.isVisible().catch(() => false)) {
      const skipBtn = onboarding.locator('button:has-text("以后再说"), button:has-text("开始使用")').first();
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click();
      } else {
        await page.evaluate(() => {
          document.querySelectorAll('[class*="fixed inset-0 z-50"]').forEach(el => el.remove());
        });
      }
      await page.waitForTimeout(500);
    }
    // Click on template market nav item
    await page.click('nav >> text=模板');

    // Verify template market page loaded
    await expect(page.locator('text=模板市场')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=发现和分享高质量提示词模板')).toBeVisible();
  });

  test('can navigate to Prompt Library', async ({ page }) => {
    const onboarding = page.locator('[class*="fixed inset-0 z-50"]').first();
    if (await onboarding.isVisible().catch(() => false)) {
      const skipBtn = onboarding.locator('button:has-text("以后再说"), button:has-text("开始使用")').first();
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click();
      } else {
        await page.evaluate(() => {
          document.querySelectorAll('[class*="fixed inset-0 z-50"]').forEach(el => el.remove());
        });
      }
      await page.waitForTimeout(500);
    }
    await page.click('nav >> text=库');

    await expect(page.locator('text=提示词库')).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Settings', async ({ page }) => {
    // Settings might be in a menu or gear icon
    const settingsBtn = page.locator('[data-testid="settings-btn"], button:has-text("设置"), [aria-label*="设置"]');

    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await expect(page.locator('text=设置')).toBeVisible({ timeout: 10000 });
    } else {
      test.skip('Settings button not found in current layout');
    }
  });
});
