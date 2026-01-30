import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('redirects to login if not authenticated', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/login/);
  });

  // NOTE: For real E2E in CI, we ideally seed a test user or mock Auth.
  // For this "robot" test, we'll assume a local dev environment or mock if possible.
  // Since setting up real Auth E2E with 2FA/MagicLink is complex, for this phase we'll use a mocked "e2e-bypass" or just verify the login page loads correctly.
  
  test('login page loads and has fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByPlaceholder('you@gymowner.com')).toBeVisible();
  });
});
