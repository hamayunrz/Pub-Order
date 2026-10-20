import { expect, test } from '@playwright/test';
import { catalog, mockMenu } from './menu-fixture.js';

test.beforeEach(async ({ page }) => {
  await mockMenu(page);
});

function progress(page, label) {
  return page.locator('.menu-swipe-progress span', { hasText: label }).locator('strong');
}

test('a student browses the menu, fills a meal swipe, and keeps the cart after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Browse menu' }).click();

  await expect(page.getByRole('heading', { name: 'What sounds good?' })).toBeVisible();
  await expect(page).toHaveURL(/#menu$/);

  await page.getByRole('button', { name: 'Add Pub Burger to cart' }).click();
  await page.getByRole('button', { name: 'Add Straight Cut Fries to cart' }).click();
  await page.getByRole('button', { name: 'Add Sweet Tea to cart' }).click();

  await expect(page.getByRole('heading', { name: 'Your cart (3)' })).toBeVisible();
  await expect(progress(page, 'Entries')).toHaveText('1/1');
  await expect(progress(page, 'Sides')).toHaveText('1/1');
  await expect(progress(page, 'Drinks')).toHaveText('1/1');

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Your cart (3)' })).toBeVisible();
  await expect(page.getByLabel('Pub Burger quantity', { exact: true })).toHaveText('1');
  await expect(page.getByLabel('Sweet Tea quantity', { exact: true })).toHaveText('1');
});

test('search and category filters narrow the menu and can be reset', async ({ page }) => {
  await page.goto('/#menu');

  await page.getByRole('button', { name: 'Beverages', exact: true }).click();
  await page.getByLabel('Find something delicious').fill('burger');
  await expect(page.getByText('No matches this time.')).toBeVisible();

  await page.getByRole('button', { name: 'Reset filters' }).click();

  await expect(page.getByRole('article')).toHaveCount(catalog.length);
});
