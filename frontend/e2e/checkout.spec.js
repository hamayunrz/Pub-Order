import { expect, test } from '@playwright/test';
import { mockMenu } from './menu-fixture.js';

test.beforeEach(async ({ page }) => {
  await mockMenu(page);
  await page.goto('/#menu');
});

test('a guest reviews a full meal and is asked to sign in without losing it', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Pub Burger to cart' }).click();
  await page.getByRole('button', { name: 'Add Straight Cut Fries to cart' }).click();
  await page.getByRole('button', { name: 'Add Sweet Tea to cart' }).click();
  await page.getByRole('button', { name: 'Review checkout' }).click();

  await expect(page.getByRole('heading', { name: 'Review your meal' })).toBeVisible();
  await expect(page.getByText('1 meal swipe')).toBeVisible();

  await page.getByRole('button', { name: 'Validate checkout' }).click();
  await expect(page.getByText('Sign in to continue. Your cart will stay here.')).toBeVisible();

  await page.getByRole('button', { name: 'Sign in and keep cart' }).click();
  await expect(page.getByRole('tab', { name: 'Sign in' })).toBeVisible();

  await page.getByRole('button', { name: 'Browse menu' }).click();
  await expect(page.getByRole('heading', { name: 'Review your meal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cart 3' })).toBeVisible();
});

test('an incomplete meal cannot be validated and says what is missing', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Pub Burger to cart' }).click();
  await page.getByRole('button', { name: 'Review checkout' }).click();

  await expect(page.getByText('Choose exactly 1 side item(s); your cart has 0.')).toBeVisible();
  await expect(page.getByText('Choose exactly 1 drink item(s); your cart has 0.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Validate checkout' })).toBeDisabled();

  await page.getByRole('button', { name: 'Back to cart' }).click();
  await expect(page.getByRole('heading', { name: 'Your cart (1)' })).toBeVisible();
});
