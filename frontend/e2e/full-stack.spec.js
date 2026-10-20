import { expect, test } from '@playwright/test';

// The real app end to end: browser → Vite → FastAPI → Supabase (local in CI). Nothing is
// mocked, so the menu comes from the database and checkout review is checked by the server.
const email = process.env.PUB_ORDER_TEST_EMAIL;
const password = process.env.PUB_ORDER_TEST_PASSWORD;

test.skip(!email || !password, 'Supabase test credentials are not set');

test('a signed-in student builds a meal from the database menu and the server validates it', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(22);

  await page.getByRole('button', { name: 'Add Pub Burger to cart' }).click();
  await page.getByRole('button', { name: 'Add Straight Cut Fries to cart' }).click();
  await page.getByRole('button', { name: 'Add Sweet Tea to cart' }).click();
  await page.getByRole('button', { name: 'Review checkout' }).click();
  await page.getByRole('button', { name: 'Validate checkout' }).click();

  await expect(page.getByText(/Your meal is valid: 1 meal swipe/)).toBeVisible();
});

test('a signed-in student places an order and it is saved', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.getByRole('button', { name: 'Add Chicken Tenders to cart' }).click();
  await page.getByRole('button', { name: 'Add Pretzel Sticks to cart' }).click();
  await page.getByRole('button', { name: 'Add Apple Juice to cart' }).click();
  await page.getByRole('button', { name: 'Review checkout' }).click();
  await page.getByRole('button', { name: 'Validate checkout' }).click();
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  const summary = page.getByRole('region', { name: 'Order summary' });
  await expect(summary.getByText('Chicken Tenders')).toBeVisible();
  await expect(summary.getByText('Pretzel Sticks')).toBeVisible();
  await expect(summary.getByText('Apple Juice')).toBeVisible();

  await page.getByRole('button', { name: 'Order something else' }).click();
  await expect(page.getByRole('heading', { name: 'A little hungry?' })).toBeVisible();

  await page.reload();

  await expect(page.getByRole('heading', { name: 'A little hungry?' })).toBeVisible();
});
