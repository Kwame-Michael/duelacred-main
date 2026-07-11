# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: onboarding.spec.ts >> SME onboarding -> dashboard loads with local fallback
- Location: tests/onboarding.spec.ts:5:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=SME Dashboard')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=SME Dashboard')

```

```yaml
- region "Notifications (F8)":
  - list
- region "Notifications alt+T"
- navigation:
  - link "Duela Cred":
    - /url: /
    - img "Duela Cred"
  - link "How It Works":
    - /url: /#how-it-works
  - link "Marketplace":
    - /url: /marketplace
  - button "Start Investing"
  - button "Apply for Funding"
- main:
  - heading "No application yet" [level=1]
  - paragraph: Apply for funding to get started.
  - link "Start application":
    - /url: /onboarding/sme
- contentinfo:
  - img "Duela Cred"
  - paragraph: Empowering African entrepreneurs, one investment at a time.
  - heading "Platform" [level=4]
  - list:
    - listitem:
      - link "Marketplace":
        - /url: /marketplace
    - listitem:
      - link "Start Investing":
        - /url: /auth
    - listitem:
      - link "Apply for Funding":
        - /url: /auth?role=sme
  - heading "Company" [level=4]
  - list:
    - listitem:
      - link "About":
        - /url: "#"
    - listitem:
      - link "Contact":
        - /url: "#"
    - listitem:
      - link "Terms":
        - /url: "#"
  - heading "Connect" [level=4]
  - list:
    - listitem:
      - link "Twitter":
        - /url: "#"
    - listitem:
      - link "LinkedIn":
        - /url: "#"
  - text: © 2026 Duela Cred. All rights reserved.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const APP_URL = process.env.APP_URL || 'http://localhost:8080';
  4  | 
  5  | test('SME onboarding -> dashboard loads with local fallback', async ({ page }) => {
  6  |   const testUser = { email: 'e2e_test_sme@example.com', name: 'E2E Test SME', role: 'sme', wallet: 0 };
  7  | 
  8  |   // Ensure localStorage is populated before page loads
  9  |   await page.addInitScript(({ user }) => {
  10 |     localStorage.setItem('duelacred_user', JSON.stringify(user));
  11 |   }, { user: testUser });
  12 | 
  13 |   await page.goto(`${APP_URL}/dashboard/sme`);
  14 | 
> 15 |   await expect(page.locator('text=SME Dashboard')).toBeVisible({ timeout: 10000 });
     |                                                    ^ Error: expect(locator).toBeVisible() failed
  16 | 
  17 |   // Optionally check for 'No application yet' or application card
  18 |   const noApp = await page.locator('text=No application yet').first().isVisible();
  19 |   // We don't fail on absence; just assert page loaded
  20 |   expect(true).toBeTruthy();
  21 | });
  22 | 
```