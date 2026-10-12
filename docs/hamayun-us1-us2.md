# Hamayun's Sprint 3: US1 and US2

## What this contribution does

US1 moves the menu from a JavaScript array to the Supabase database, reached through FastAPI. US2 adds a checkout review screen and a server check of the cart. Hamayun confirmed that the project should keep **meal swipes**, so this implementation uses swipe totals rather than the dollar prices mentioned in the sprint PDF.

One swipe requires exactly one entrée (`Entry` in the data), one `Side`, and one `Drink`. Two swipes require two of each. The existing limit of ten swipes remains. Milkshakes still count as an entrée. A partly filled meal can stay in the cart, but cannot pass checkout validation.

This is checkout **review**, not order creation. Nothing is charged, no meal balance is debited, no kitchen order is sent, and the cart is not cleared. Saving an order is US3. The screen explicitly says that no order has been placed.

## How the branch was prepared

The existing repository was cloned into a separate local checkout so the original working directory remained unchanged. The branch `feature/hamayun-us1-us2` starts from shared `origin/main` at `ceed486`. The current menu/cart branch at `d295e10` was then merged locally. Main already contained the initial frontend and backend tests; the menu branch contained the 22-item catalog, meal-swipe controls, photos, and diagrams.

The merge had one conflict in `frontend/package.json`: one branch added Vitest commands and the other added `test:cart`. Both were retained. The integration is its own commit, separate from US1/US2 implementation. No merge to shared main or push to GitHub has been performed.

## US1: database menu

The migration `supabase/migrations/202610120001_menu_items.sql` creates `public.menu_items` and seeds the existing 22 items. These are the project's existing catalog entries, not a connection to Vanderbilt's official live dining feed.

Each row has an ID, name, category, meal classification, portion, description, dietary label, image filename, availability flag, and display order. IDs and image filenames match the previous catalog, so existing meal-swipe carts and photos remain useful. The database rejects meal classifications other than Entry, Side, or Drink.

The migration enables row-level security. Anonymous visitors and authenticated students may read the menu, but cannot insert, update, delete, or truncate it. Availability is changed by a database administrator, not an ordinary student browser.

`backend/app/menu.py` provides `GET /menu`. It reads Supabase through the existing configured client, sorts by display order, and maps database `swipe_type` to browser `swipeType`. A database/configuration failure returns a generic 503 error rather than exposing internal details. Successful responses disable caching.

`frontend/src/menu-api.js` requests `/api/menu`. Vite already forwards `/api` to the backend on port 8001 and strips the prefix. It checks the response shape before rendering it. `Menu.jsx` now creates search results and category buttons from the returned catalog. It shows loading, empty, failed, and no-match states, offers retry/refresh controls, and disables adding unavailable items. There is no fallback to a hardcoded menu when the database fails.

`menu-data.js` remains only as a seed reference and test fixture; the running UI no longer imports it. To change the live menu, update the database rather than this file.

## US2: checkout review

The Review checkout button opens `Checkout.jsx`, which shows every selected item, its quantity and classification, totals by meal category, and the total swipes. Empty carts cannot open checkout. Invalid or incomplete carts cannot validate.

The browser checks quantities for immediate feedback. The backend independently requires whole integers from 1 to 10, rejects booleans and numeric strings, rejects duplicate item IDs and extra fields, and checks complete meal composition using current database values. Browser validation alone would be insufficient because a client can send a custom API request.

When the student chooses Validate checkout:

1. The browser asks Supabase Auth for the current session.
2. If no session exists, it offers Sign in and keep cart.
3. Otherwise it sends the bearer access token and cart to `POST /api/checkout/review`.
4. FastAPI verifies the token using the existing authentication dependency.
5. The backend reloads the catalog and checks quantities, availability, classification changes, and the swipe total.
6. It returns current items, category counts, issues, and `canSubmit`.
7. The screen either explains what needs fixing or confirms that the meal is valid. It does not claim an order was saved.

An expired session also prompts sign-in. Network/server errors retain the cart and allow retry. Responses that arrive after the cart changes or checkout closes are ignored.

## Why menu changes require review

The cart now stores `reviewedTypes`, a record of the classification when an item was selected or last explicitly reviewed. For example, if an item was a Drink when added but now counts as an Entry, the backend reports that change instead of silently accepting a different meal composition.

Review updated menu applies the current values, returns to the cart, and requires a new validation. Unavailable or deleted items remain visible until the student removes them; they are not silently dropped. This is the meal-swipe equivalent of reviewing a changed price in the original dollar-based acceptance criteria.

The existing local-storage key is retained. Old meal-swipe carts without `reviewedTypes` still load and use the current catalog for their initial classification. Malformed saved quantities are discarded during restoration; manually constructed invalid checkout requests are rejected by the backend.

`App.jsx` keeps the menu component mounted while displaying login. That preserves the cart and checkout in memory even if local storage is blocked. With working storage, the cart also survives a page refresh. With blocked storage, refresh or closing the tab still loses the in-memory cart, and the UI explains this limitation.

## API contract for Luke's US3

Browser requests go to `/api/checkout/review`; direct backend clients use `/checkout/review`.

```json
{
  "swipes": 1,
  "items": [
    { "id": "pub-burger", "quantity": 1, "expectedSwipeType": "Entry" },
    { "id": "straight-cut-fries", "quantity": 1, "expectedSwipeType": "Side" },
    { "id": "sweet-tea", "quantity": 1, "expectedSwipeType": "Drink" }
  ]
}
```

The Authorization header must contain `Bearer <current access token>`. A successful review response contains `items`, `swipes`, `counts`, `issues`, and `canSubmit`. An issue has a `code`, `message`, and, where applicable, item `id`. Codes are `unavailable`, `changed`, or `composition`. A normal response with issues has HTTP 200 and `canSubmit: false`; invalid payloads use 422, missing/invalid authentication uses 401, and catalog failures use 503.

US3 must revalidate authentication and the database catalog at the actual save, then save order/items atomically with duplicate prevention. A previous `canSubmit: true` is not a reservation or authorization to trust browser values later. Clear the cart only after a successful save. No order endpoint was invented here because it belongs to the team's US3 work.

## Tests and what they prove

- **44 React tests:** 24 existing tests plus 20 menu/checkout cases. They cover loading, empty/error/retry states, invalid responses, filters, unavailable items, cart display, guest/expired sessions, changed catalog review, failed validation retry, stale responses, refresh, cart focus, and cart retention through the real login UI with blocked storage. Supabase Auth and HTTP responses are mocked.
- **14 Node cart tests:** dynamic database-only IDs, quantities, capacity, milkshake classification, immutability, restoration, invalid storage, removed IDs, filtering, complete meal validation, and classification snapshots. These replace/adapt the previous static-catalog cart tests.
- **46 backend tests:** 16 existing tests plus 30 menu/checkout cases including parameterized invalid quantities/swipes. Supabase calls are mocked; tests exercise FastAPI validation, authentication rejection, database failures, database-derived counts, changed/unavailable/deleted items, and lack of writes.
- **PostgreSQL migration assertions:** migration applied to a disposable local PostgreSQL instance. Checked the 22 seeds, 11 entrée-classified items, valid classifications, row-level security, guest/student reads, and denied writes. Tests roll back their transaction. These tests are in `supabase/tests/menu_items.sql`.
- **Production build:** Vite compiles successfully.
- **Browser check:** clicked through selection, review, and the guest sign-in prompt using the real frontend and FastAPI with an adapter reading the disposable local database. This was not a live Supabase or live sign-in test. The browser review caught and fixed total spacing.

Vitest explicitly collects only `src/**/*.test.{js,jsx}`. The `.node.mjs` tests use Node's runner, so tests are not collected twice. The existing GitHub workflows already run frontend/backend tests, cart tests, and the build on pull requests to main. A `menu-schema` job was added to `tests.yml` to run the migration and SQL assertions on a disposable PostgreSQL 16 service. Hosted CI itself has not run because this branch has not been pushed.

Installing dependencies exposed an existing development dependency advisory. The lockfile updates only `source-map-js` from 1.2.1 to 1.2.2. The subsequent npm audit reported zero vulnerabilities. Backend tests emit an upstream Starlette TestClient deprecation warning; all pass.

## Set up the real application

The source checkout containing this work is separate from `/Users/hammy/Documents/Pub-Order`. Open the checkout linked in the chat. The completed feature branch will also be imported into the original repository without switching its working files; use `git switch feature/hamayun-us1-us2` there to open the work. Run `npm ci` after switching because its dependencies differ from the old menu branch.

1. In the intended Supabase project, apply `supabase/migrations/202610120001_menu_items.sql` once through SQL Editor or your team's migration tooling. It intentionally creates a new table rather than overwriting an existing catalog. If that table already exists, inspect its schema and reconcile it before applying.
2. Copy `.env.example` to `.env` at the checkout root and fill in that project's URL and publishable/anon key. Use only a browser-safe key: Vite exposes the configured `SUPABASE_` variables to the frontend. Never use a service-role key here.
3. Start the backend and frontend below. Restart Vite after changing environment variables.

Backend, from the checkout root:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8001
```

Frontend, in another terminal from the checkout root:

```sh
cd frontend
npm ci
npm run dev
```

Choose Browse menu. Add Pub Burger, Straight Cut Fries, and Sweet Tea. Review should show one of each and one meal swipe. Validate as a guest to see the sign-in prompt; after signing in, validate again. For two swipes, increase the swipe count and choose two of each category.

Run automated checks from the checkout root:

```sh
(cd frontend && npm test && npm run test:cart && npm run build)
(cd backend && .venv/bin/python -m pytest -q)
```

No root `.env` was found in the original repository during this task. The shared Supabase migration and a live Supabase smoke test remain pending. Automated tests do not need Supabase credentials. No hosting deployment, shared database change, order submission, or main-branch merge was performed.
