import { MENU_ITEMS } from '../src/menu-data.js';

// The menu now comes from GET /api/menu (backend + Supabase). These journeys run
// against the Vite dev server alone, so the browser's menu request is answered here
// with the seed menu. The sign-in journey uses the real backend instead.
export const catalog = MENU_ITEMS.map((item) => ({ ...item, available: true }));

export async function mockMenu(page, items = catalog) {
  await page.route('**/api/menu', (route) => route.fulfill({ json: items }));
}
