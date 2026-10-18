import { expect, test } from '@playwright/test';
import { mockMenu } from './menu-fixture.js';

test('the app loads on the login page', async ({ page }) => {
  await mockMenu(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'The Pub' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Browse menu' })).toBeVisible();
});
