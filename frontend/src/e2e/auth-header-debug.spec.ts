import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

test.describe('Auth Header Debug', () => {
  test('should show auth headers on dashboard requests', async ({ page }) => {
    const requests: { url: string; auth: string | null; csrf: string | null }[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/v1/dashboard/summary') || url.includes('/auth/refresh')) {
        requests.push({
          url,
          auth: request.headers()['authorization'] || null,
          csrf: request.headers()['x-csrf-token'] || null,
        });
      }
    });

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input#email', { timeout: 15000 });
    await page.fill('input#email', 'admin@iso-management.local');
    await page.fill('input#password', 'Demo2024Secure!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 15000 });

    await page.reload();
    await page.waitForTimeout(5000);

    console.log('Requests:', JSON.stringify(requests, null, 2));
  });
});
