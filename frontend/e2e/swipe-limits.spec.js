import { expect, test } from '@playwright/test';

test('meal swipes limit each part of the meal and can be raised', async ({ page }) => {
  await page.goto('/#menu');

  const addBurger = page.getByRole('button', { name: 'Add Pub Burger to cart' });
  const addTenders = page.getByRole('button', { name: 'Add Chicken Tenders to cart' });
  const increaseSwipes = page.getByRole('button', { name: 'Increase meal swipes' });
  const decreaseSwipes = page.getByRole('button', { name: 'Decrease meal swipes' });

  await addBurger.click();

  await expect(addTenders).toBeDisabled();
  await expect(addTenders).toHaveText(/Entry limit reached/);
  await expect(page.getByRole('button', { name: 'Add Straight Cut Fries to cart' })).toBeEnabled();

  await increaseSwipes.click();
  await expect(page.getByLabel('Meal swipes count', { exact: true })).toHaveText('2');
  await addTenders.click();

  await expect(page.getByRole('heading', { name: 'Your cart (2)' })).toBeVisible();
  await expect(decreaseSwipes).toBeDisabled();

  await page.getByRole('button', { name: 'Clear cart' }).click();

  await expect(page.getByRole('heading', { name: 'A little hungry?' })).toBeVisible();
  await expect(decreaseSwipes).toBeEnabled();
});
