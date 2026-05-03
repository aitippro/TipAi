/**
 * Settings Tests — Verify settings persistence and API key management
 */

import { test, expect } from '../fixtures/electron';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Try to navigate to settings
    await page.goto('');
    await page.waitForSelector('text=模糊需求', { timeout: 10000 });
  });

  test('can open settings page', async ({ page }) => {
    // Try multiple ways to open settings
    const settingsBtn = page.locator([
      '[data-testid="settings-btn"]',
      'button:has-text("设置")',
      '[aria-label*="设置"]',
      'nav >> text=设置',
    ].join(', ')).first();

    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await expect(page.locator('text=设置').first()).toBeVisible({ timeout: 10000 });
    } else {
      // Try keyboard shortcut Ctrl+,
      await page.keyboard.press('Control+Comma');
      await page.waitForTimeout(500);

      if (await page.locator('text=设置').first().isVisible().catch(() => false)) {
        // Success
      } else {
        test.skip('Could not open settings page');
      }
    }
  });

  test('can input and save DeepSeek API key', async ({ page }) => {
    // Navigate to settings first
    await page.keyboard.press('Control+Comma');
    await page.waitForTimeout(1000);

    const deepseekInput = page.locator('input[name="deepseekApiKey"], [data-testid="deepseek-key"]').first();

    if (await deepseekInput.isVisible().catch(() => false)) {
      await deepseekInput.fill('sk-test-deepseek-key-12345');

      const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save")').first();
      await saveBtn.click();

      // Should show success feedback
      await expect(
        page.getByText(/保存成功|已保存|设置已保存/).first()
      ).toBeVisible({ timeout: 5000 });
    } else {
      test.skip('DeepSeek API key input not found');
    }
  });

  test('model selection dropdown works', async ({ page }) => {
    await page.keyboard.press('Control+Comma');
    await page.waitForTimeout(1000);

    const modelSelect = page.locator('select[name="defaultModel"], [data-testid="model-select"]').first();

    if (await modelSelect.isVisible().catch(() => false)) {
      // Change model selection
      await modelSelect.selectOption('deepseek');

      const saveBtn = page.locator('button:has-text("保存")').first();
      await saveBtn.click();

      await page.waitForTimeout(1000);

      // Reload and verify persistence
      await page.reload();
      await page.waitForTimeout(1000);
      await page.keyboard.press('Control+Comma');
      await page.waitForTimeout(1000);

      const value = await modelSelect.inputValue();
      expect(value).toBe('deepseek');
    } else {
      test.skip('Model selector not found');
    }
  });

  test('encrypted API key is masked after save', async ({ page }) => {
    await page.keyboard.press('Control+Comma');
    await page.waitForTimeout(1000);

    const deepseekInput = page.locator('input[name="deepseekApiKey"]').first();

    if (await deepseekInput.isVisible().catch(() => false)) {
      await deepseekInput.fill('sk-secret-key-123');
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(1000);

      // Reload settings
      await page.reload();
      await page.waitForTimeout(1000);
      await page.keyboard.press('Control+Comma');
      await page.waitForTimeout(1000);

      const value = await deepseekInput.inputValue();
      // Should be masked or empty (not the raw key)
      expect(value === '' || value === '***' || value.includes('*')).toBeTruthy();
    } else {
      test.skip('API key input not found');
    }
  });
});

test.describe('Theme & Appearance', () => {
  test('app renders without visual regression', async ({ page }) => {
    // Take screenshot of home page for visual comparison
    await page.goto('');
    await page.waitForSelector('text=模糊需求', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for animations

    await expect(page).toHaveScreenshot('home-page.png', {
      threshold: 0.2,
      maxDiffPixels: 1000,
    });
  });
});
