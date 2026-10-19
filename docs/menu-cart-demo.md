> Historical menu/cart guide. US1/US2 now load the menu from Supabase and add checkout review. Use [the current walkthrough](hamayun-us1-us2.md) for setup and demonstrations.

# Menu and cart presentation

## Contribution

The student-facing sample menu supports category filters, text search, adding items,
quantity changes, removal, clearing the cart, and an exact subtotal calculated in
integer cents. The cart is saved in this browser's local storage and restored on
refresh. Saved quantities are validated against the sample catalog.

The login page offers **Browse sample menu**, which works without authentication
or a backend. Successful sign-in also opens the menu after the existing backend
session check. Browsing is public; it does not authorize any backend operation.

The eight sample items, prices, and availability are presentation data, not a live
Pub menu. Checkout, payment, kitchen submission, and database storage are not
implemented. The displayed amount is a subtotal before any taxes or fees.

## Run

From `frontend/`, using Node 22.12+ (the repository's `.nvmrc` selects Node 24):

```sh
npm ci
npm run dev
```

Open the displayed local URL and select **Browse sample menu**. For an actual
sign-in, the root `.env` must configure Supabase and the Python backend must run
with `uvicorn app.main:app --reload --port 8001` from `backend/` with its virtual
environment active and requirements installed. Vite's existing proxy uses 8001.

## 60-second demonstration

1. Select **Browse sample menu** on the login page.
2. Show the category filters; select **Burgers**, then **All**.
3. Search for `fries`, show the result, then clear the search.
4. Add a Pub Burger twice and Seasoned Fries once. The cart should contain three
   items with a subtotal of **$25.85**.
5. Decrease the burger quantity to one. The subtotal should become **$14.90**.
6. Refresh the page. The menu and saved cart should remain visible.
7. Remove the fries, then decrease the burger quantity to zero. Show the empty
   cart. Add items again and demonstrate **Clear cart**.
8. Search for `zzz` and show the empty search state and **Reset filters** button.

On a narrow viewport, the cart moves below the menu. The header's **Cart** link
scrolls to it and focuses its heading. Buttons have descriptive accessible names.

## Verification

```sh
npm run test:cart
npm run build
```

The eight Node tests cover price arithmetic, quantity changes/removal, quantity
limits, persistence serialization, corrupt/invalid saved data, combined search and
category filtering, and empty totals. They need no additional test dependencies.
They do not verify live authentication or the UI; use the demo steps for UI checks.
The new test command is separate from the pending `initial-tests` branch's Vitest
suite. Its `.node.mjs` filename keeps Vitest from collecting Node-runner tests.
The `Tests` GitHub Actions workflow (`.github/workflows/tests.yml`) runs the cart
checks with the rest of the frontend tests, plus the production build, on every
pull request and every push to `main`.

## Files to explain

- `frontend/src/menu-data.js`: sample catalog and categories.
- `frontend/src/cart.js`: quantity, filtering, storage validation, and subtotal logic.
- `frontend/src/Menu.jsx`: menu and cart components, browser persistence.
- `frontend/src/menu.css`: responsive styles matching the existing login page.
- `frontend/src/App.jsx`: switching between login and menu.
- `frontend/src/Login.jsx`: optional browse and successful-sign-in callbacks.
- `frontend/src/cart.test.js`: automated cart and filtering checks (run with `npm run test:cart`).
- `.github/workflows/tests.yml`: automated tests (including the cart checks) and production build.

For evidence, capture your branch diff and the passing test output, then record the
demo above. Describe this as a sample menu/cart feature; it does not place orders.
