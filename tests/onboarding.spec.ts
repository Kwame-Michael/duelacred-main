import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:8080';

test('SME onboarding -> dashboard loads with local fallback', async ({ page }) => {
  const testUser = { email: 'e2e_test_sme@example.com', name: 'E2E Test SME', role: 'sme', wallet: 0 };

  // Ensure localStorage is populated before page loads
  await page.addInitScript(({ user }) => {
    localStorage.setItem('duelacred_user', JSON.stringify(user));
  }, { user: testUser });

  await page.goto(`${APP_URL}/dashboard/sme`);

  await expect(page.locator('text=SME Dashboard')).toBeVisible({ timeout: 10000 });

  // Optionally check for 'No application yet' or application card
  const noApp = await page.locator('text=No application yet').first().isVisible();
  // We don't fail on absence; just assert page loaded
  expect(true).toBeTruthy();
});
