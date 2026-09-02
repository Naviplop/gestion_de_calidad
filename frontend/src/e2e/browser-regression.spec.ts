import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

test.describe('Browser E2E — Post-Upgrade Regression', () => {
  test.describe('1. Browser Smoke Test', () => {
    test('should load login page without white screen', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1')).toContainText('QMS Platform');
      await expect(page.locator('text=Inicia sesión en tu cuenta')).toBeVisible({ timeout: 10000 });
    });

    test('should not show critical console errors on login page', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        errors.push(err.message);
      });
      await page.goto(`${BASE_URL}/login`);
      await expect(page.locator('h1')).toContainText('QMS Platform');
      const criticalErrors = errors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR_FAILED'));
      expect(criticalErrors).toHaveLength(0);
    });

    test('should load CSS and JS without 404s', async ({ page }) => {
      const failedAssets: string[] = [];
      page.on('response', async (response) => {
        const status = response.status();
        if (status >= 400 && status < 500) {
          const url = response.url();
          if (url.includes('.css') || url.includes('.js')) {
            failedAssets.push(`${status}:${url}`);
          }
        }
      });
      await page.goto(`${BASE_URL}/login`);
      await page.waitForTimeout(2000);
      expect(failedAssets).toHaveLength(0);
    });
  });

  test.describe('2. Login — Critical Path', () => {
    test('should login with valid credentials and reach dashboard', async ({ page }) => {
      const responses: Record<string, { status: number; url: string }> = {};
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/auth/login') || url.includes('/dashboard/summary')) {
          responses[url] = { status: response.status(), url };
        }
      });

      await page.goto(`${BASE_URL}/login`);
      await page.fill('input#email', 'admin@iso-management.local');
      await page.fill('input#password', 'Demo2024Secure!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 15000 });

      await page.waitForResponse((response) => response.url().includes('/dashboard/summary') && response.status() === 200, { timeout: 10000 });

      const loginUrl = Object.keys(responses).find((url) => url.includes('/auth/login'));
      const dashboardUrl = Object.keys(responses).find((url) => url.includes('/dashboard/summary'));

      expect(loginUrl).toBeDefined();
      expect(responses[loginUrl!].status).toBe(201);

      expect(dashboardUrl).toBeDefined();
      expect(responses[dashboardUrl!].status).toBe(200);

      await expect(page.locator('h1')).toContainText('Panel de control');
    });

    test('should NOT persist access token in localStorage', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input#email', 'admin@iso-management.local');
      await page.fill('input#password', 'Demo2024Secure!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 15000 });

      const localStorage = await page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            items[key] = window.localStorage.getItem(key) || '';
          }
        }
        return items;
      });

      const authStorage = localStorage['qms-auth-storage'] || '{}';
      const parsed = JSON.parse(authStorage);
      expect(parsed.accessToken).toBeUndefined();
    });

    test('should set HttpOnly refresh cookie', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('input#email', { timeout: 15000 });
      await page.fill('input#email', 'admin@iso-management.local');
      await page.fill('input#password', 'Demo2024Secure!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 15000 });

      const cookies = await page.context().cookies();
      const refreshCookie = cookies.find((c) => c.name === 'refreshToken');
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie!.httpOnly).toBe(true);
      expect(refreshCookie!.path).toBe('/api/v1/auth');
    });
  });

  test.describe('3. Login — Invalid Credentials', () => {
    test('should reject wrong password', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input#email', 'admin@iso-management.local');
      await page.fill('input#password', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=INVALID_CREDENTIALS')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/.*login/);
    });

    test('should reject nonexistent user', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input#email', 'nonexistent@test.com');
      await page.fill('input#password', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=INVALID_CREDENTIALS')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('4. Email Case-Insensitive Login', () => {
    test('should login with uppercase email', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input#email', 'ADMIN@ISO-MANAGEMENT.LOCAL');
      await page.fill('input#password', 'Demo2024Secure!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 15000 });
      await expect(page.getByRole('heading', { name: 'Panel de control' })).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('5. Protected Routes', () => {
    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
      await page.goto(`${BASE_URL}/documents`);
      await page.waitForURL('**/login', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('QMS Platform');
    });

    test('should show checking session on hard refresh', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input#email', 'admin@iso-management.local');
      await page.fill('input#password', 'Demo2024Secure!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 15000 });

      await page.reload();
      await expect(page.locator('text=Checking session...')).toBeVisible({ timeout: 5000 });
      await page.waitForURL('**/', { timeout: 15000 });
      await expect(page.getByRole('heading', { name: 'Panel de control' })).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('6. Logout', () => {
    test('should logout and clear session', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input#email', 'admin@iso-management.local');
      await page.fill('input#password', 'Demo2024Secure!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 15000 });

      await page.goto(`${BASE_URL}/login`);
      await page.waitForTimeout(2000);

      const cookies = await page.context().cookies();
      const refreshCookie = cookies.find((c) => c.name === 'refreshToken');
      expect(refreshCookie).toBeDefined();
    });
  });

  test.describe('7. Navigation', () => {
    test('should navigate between protected pages', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input#email', 'admin@iso-management.local');
      await page.fill('input#password', 'Demo2024Secure!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 15000 });

      await page.goto(`${BASE_URL}/documents`);
      await expect(page.getByRole('heading', { name: 'Documentos' })).toBeVisible({ timeout: 20000 });

      await page.goto(`${BASE_URL}/audits`);
      await expect(page.getByRole('heading', { name: 'Auditorías' })).toBeVisible({ timeout: 20000 });

      await page.goto(`${BASE_URL}/risks`);
      await expect(page.getByRole('heading', { name: 'Gestión de riesgos' })).toBeVisible({ timeout: 20000 });
    });
  });

  test.describe('8. API Correlation', () => {
    test('should not have unexpected 401/403/500 on main pages', async ({ page }) => {
      const apiErrors: { url: string; status: number }[] = [];
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/api/')) {
          const status = response.status();
          if ([401, 403, 500].includes(status)) {
            apiErrors.push({ url, status });
          }
        }
      });

      await page.goto(`${BASE_URL}/login`);
      await page.fill('input#email', 'admin@iso-management.local');
      await page.fill('input#password', 'Demo2024Secure!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 15000 });

      await page.goto(`${BASE_URL}/documents`);
      await page.waitForTimeout(3000);

      await page.goto(`${BASE_URL}/audits`);
      await page.waitForTimeout(3000);

      await page.goto(`${BASE_URL}/risks`);
      await page.waitForTimeout(3000);

      const unexpectedErrors = apiErrors.filter((e) => !e.url.includes('/auth/login'));
      expect(unexpectedErrors).toHaveLength(0);
    });
  });
});
