import { expect, test } from '@playwright/test';

const email = process.env.PUB_ORDER_TEST_EMAIL;
const password = process.env.PUB_ORDER_TEST_PASSWORD;

test.skip(!email || !password, 'Supabase test credentials are not set');

test('a student signs in and lands on the menu', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'What sounds good?' })).toBeVisible();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(page).toHaveURL(/#menu$/);
});
