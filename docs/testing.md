# Tests

This page lists every automated test in the project: where it is and what it checks. For how to run the tests, see [Running tests](../README.md#running-tests) in the README.

**Totals:**
- **Backend (pytest):** 26 tests, 3 of them integration tests
- **Frontend (Vitest + React Testing Library):** 100 tests
- **E2E (Playwright):** 5 tests

Tests marked "×N" run once per input listed.

| Level | What it means here | Where |
|---|---|---|
| **Unit and component** | One function or component, with Supabase and `fetch` faked | `backend/tests/`, `frontend/src/*.test.js(x)` |
| **Integration** | Several real pieces together. Some fake only the outside services; others call a **real Supabase project** | `frontend/src/signin-flow.test.jsx`, the contract tests, `backend/tests/integration/` |
| **E2E** | The real app in a real browser (Chromium), started with the Vite dev server | `frontend/e2e/` |

**Real Supabase is only used when test credentials are set.** Most tests fake Supabase and need no `.env`, network or accounts. The backend integration tests and the sign-in E2E journey run only when `PUB_ORDER_TEST_EMAIL` and `PUB_ORDER_TEST_PASSWORD` are set; otherwise they are skipped.

GitHub Actions ([.github/workflows/tests.yml](../.github/workflows/tests.yml)) runs the backend, frontend and E2E jobs on every pull request and every push to `main`. The backend and frontend jobs fail if branch coverage drops below 70%.

## Backend

Location: [backend/tests/](../backend/tests/). Run with `pytest` from `backend/`.

### Shared setup: [conftest.py](../backend/tests/conftest.py)

Contains no tests. It provides fixtures that every test file can use:

| Fixture | What it does |
|---|---|
| `clear_caches` | Runs automatically around every test. Clears the cached settings and Supabase client, so one test's settings can't leak into the next. |
| `client` | A FastAPI `TestClient` for sending requests to the app without starting a server. |
| `fake_auth` | Replaces the Supabase client with a fake. A test sets `fake_auth.result` to the user Supabase should return, or to an exception it should raise. `fake_auth.tokens` records which tokens were checked. |

### `GET /me` endpoint: [test_me.py](../backend/tests/test_me.py)

Covers `get_current_user` in [app/auth.py](../backend/app/auth.py), which protects `/me`.

| Test | What it checks |
|---|---|
| [`test_missing_token_returns_401`](../backend/tests/test_me.py#L16) | A request with no `Authorization` header gets 401 "Sign in required.", and Supabase is never called. |
| [`test_non_bearer_scheme_returns_401`](../backend/tests/test_me.py#L24) | A header that isn't `Bearer <token>` (e.g. `Basic`) gets 401. |
| [`test_valid_token_returns_user`](../backend/tests/test_me.py#L31) | A valid token returns 200 with the user's `id` and `email`, and the exact token was passed to Supabase. |
| [`test_rejected_token_returns_401`](../backend/tests/test_me.py#L43) | When Supabase rejects the token (`AuthApiError`), the response is 401. |
| [`test_unreachable_supabase_returns_503`](../backend/tests/test_me.py#L52) | When Supabase can't be reached (network error), the response is 503 "Could not reach the account service." |
| [`test_empty_response_returns_401`](../backend/tests/test_me.py#L61) | When Supabase returns nothing, the response is 401. |
| [`test_response_without_user_returns_401`](../backend/tests/test_me.py#L69) | When Supabase returns a response with no user, the response is 401. |
| [`test_unconfigured_supabase_returns_503`](../backend/tests/test_me.py#L77) | When `SUPABASE_URL`/`SUPABASE_KEY` are missing, the response is 503 "Sign-in is not configured." |

### Supabase client: [test_supabase_client.py](../backend/tests/test_supabase_client.py)

Covers `get_supabase` in [app/auth.py](../backend/app/auth.py). `create_client` is replaced, so nothing is sent to Supabase.

| Test | What it checks |
|---|---|
| [`test_creates_client_from_settings`](../backend/tests/test_supabase_client.py#L23) | The client is created with the URL and key from the settings. |
| [`test_reuses_the_same_client`](../backend/tests/test_supabase_client.py#L30) | Later calls return the same client instead of creating a new one. |
| [`test_unconfigured_settings_raise_503`](../backend/tests/test_supabase_client.py#L38) | Missing settings raise a 503 error instead of creating a broken client. |

### Settings: [test_config.py](../backend/tests/test_config.py)

Covers `get_settings` and `Settings` in [app/config.py](../backend/app/config.py).

| Test | What it checks |
|---|---|
| [`test_reads_and_trims_environment`](../backend/tests/test_config.py#L8) | The Supabase URL and key are read from the environment with surrounding spaces and newlines removed, and count as configured. |
| [`test_missing_environment_is_not_configured`](../backend/tests/test_config.py#L19) | With neither variable set, both values are empty and Supabase counts as not configured. |
| [`test_blank_value_is_not_configured`](../backend/tests/test_config.py#L38) ×3 | Supabase counts as not configured if the URL is blank, the key is blank, or both are. |

### CORS: [test_cors.py](../backend/tests/test_cors.py)

Covers the CORS settings in [app/main.py](../backend/app/main.py), which decide which websites may call the backend from a browser.

| Test | What it checks |
|---|---|
| [`test_frontend_origin_is_allowed`](../backend/tests/test_cors.py#L18) ×2 | Browser preflight requests from the dev frontend (`http://localhost:5173` and `http://127.0.0.1:5173`) are allowed, including the `Authorization` header. |
| [`test_unknown_origin_is_rejected`](../backend/tests/test_cors.py#L26) | A preflight request from any other website is rejected with 400 and no allow header. |

### Contract with the frontend: [test_contract.py](../backend/tests/test_contract.py)

Checks what the frontend relies on from the backend.

| Test | What it checks |
|---|---|
| [`test_me_route_accepts_get`](../backend/tests/test_contract.py#L10) | `GET /me` exists, which the login page calls through `/api/me`. |
| [`test_me_returns_only_id_and_email`](../backend/tests/test_contract.py#L16) | `/me` returns JSON with exactly `id` and `email`, and no other user data such as a phone number or metadata. |
| [`test_me_returns_id_as_a_string`](../backend/tests/test_contract.py#L32) | The user id is always a string. |
| [`test_settings_come_from_the_repo_root_env`](../backend/tests/test_contract.py#L40) | The backend reads `.env` from the repo root, the same file the frontend uses. |

### Integration with real Supabase: [integration/test_supabase_auth.py](../backend/tests/integration/test_supabase_auth.py)

Marked `integration`. Skipped unless `PUB_ORDER_TEST_EMAIL`, `PUB_ORDER_TEST_PASSWORD`, `SUPABASE_URL` and `SUPABASE_KEY` are set. The test user must already exist and be confirmed.

| Test | What it checks |
|---|---|
| [`test_real_token_returns_the_signed_in_user`](../backend/tests/integration/test_supabase_auth.py#L42) | Signs the test user in with Supabase, sends the real token to `/me`, and gets 200 with the same email. |
| [`test_garbage_token_is_rejected`](../backend/tests/integration/test_supabase_auth.py#L49) | Real Supabase rejects a made-up token, so `/me` returns 401. |
| [`test_token_with_tampered_signature_is_rejected`](../backend/tests/integration/test_supabase_auth.py#L55) | A real token with a changed signature is rejected with 401. |

## Frontend

Location: [frontend/src/](../frontend/src/), in files ending in `.test.js` or `.test.jsx`. Run with `npm test` from `frontend/`.

### Shared setup: [test/setup.js](../frontend/src/test/setup.js)

Contains no tests. Vitest runs it before every test file (configured in the `test` block of [vite.config.js](../frontend/vite.config.js)). It adds DOM checks such as `toBeInTheDocument()` and `toBeDisabled()`, and clears the rendered page after each test. Tests run in `jsdom`, a simulated browser. Files in `frontend/e2e/` are excluded; those are Playwright tests.

### Cart rules: [cart.test.js](../frontend/src/cart.test.js)

Covers [cart.js](../frontend/src/cart.js), which enforces the meal-swipe rules: each swipe covers one Entry, one Side and one Drink, up to 10 swipes. `npm run test:cart` runs this file alone.

| Test | What it checks |
|---|---|
| [one swipe allows exactly one entry, one side, and one drink](../frontend/src/cart.test.js#L9) | A single swipe fits exactly one item of each type. |
| [adding beyond the swipe count for a type is ignored](../frontend/src/cart.test.js#L19) | A second Entry on one swipe is not added. |
| [milkshakes count toward the Entry allowance, not Drink](../frontend/src/cart.test.js#L27) | Milkshakes use the Entry slot. |
| [decreasing to zero removes the item without changing other items](../frontend/src/cart.test.js#L35) | Setting a quantity to 0 removes only that item, and the original cart isn't changed. |
| [increasing swipes unlocks more of each type, decreasing is capped by current usage](../frontend/src/cart.test.js#L42) | More swipes allow more items; swipes can't drop below what's in the cart. |
| [setSwipes ignores invalid values and respects MAX_SWIPES](../frontend/src/cart.test.js#L53) | 0 and 1.5 are ignored; 15 is capped at 10. |
| [setQuantity ignores unknown items and invalid quantities](../frontend/src/cart.test.js#L60) | Unknown ids, 1.5 and `NaN` leave the cart unchanged. |
| [saved cart survives serialization](../frontend/src/cart.test.js#L67) | A cart saved as JSON is restored exactly. |
| [corrupt storage and unexpected shapes safely return a fresh cart](../frontend/src/cart.test.js#L73) ×8 | Broken or unexpected saved data gives an empty one-swipe cart. |
| [restoring a cart rejects unknown items, invalid quantities, and over-cap entries](../frontend/src/cart.test.js#L79) | Only valid items that fit the saved swipes are restored. |
| [search combines with category and ignores case and surrounding spaces](../frontend/src/cart.test.js#L87) | Search and category filters work together. |
| [setQuantity boundary: zero and negative quantities remove the item, one keeps it](../frontend/src/cart.test.js#L97) | Boundary values −1, 0 and 1. |
| [setQuantity boundary: quantities just below, at, and just above the swipe count](../frontend/src/cart.test.js#L104) | With 3 swipes: 2 and 3 are kept, 4 is capped at 3. |
| [setQuantity boundary: other items of the same type shrink the allowance](../frontend/src/cart.test.js#L111) | Other Entries reduce what's left; a full type adds nothing. |
| [setQuantity boundary: an item does not count against its own allowance](../frontend/src/cart.test.js#L120) | Re-setting an item's quantity isn't blocked by itself. |
| [setQuantity boundary: MAX_SWIPES is reachable but cannot be exceeded](../frontend/src/cart.test.js#L126) | 10 is allowed, 11 is capped at 10. |
| [empty cart has zero counts and no line items](../frontend/src/cart.test.js#L132) | The summary of an empty cart. |
| [MAX_SWIPES is reachable and one more is capped](../frontend/src/cart.test.js#L138) | Swipes can be set to 10; 11 becomes 10. |
| [swipes can drop to exactly the busiest type but not below it](../frontend/src/cart.test.js#L144) | With 2 Entries, swipes can go to 2 but not 1. |
| [negative, fractional, and NaN values leave the cart unchanged](../frontend/src/cart.test.js#L150) ×3 | Invalid swipe counts are ignored. |
| [does not modify the original cart](../frontend/src/cart.test.js#L157) | `setSwipes` returns a new cart. |
| [caps saved swipes at MAX_SWIPES and re-checks items against the cap](../frontend/src/cart.test.js#L165) | Saved swipes above 10 become 10, and items over the new cap are dropped. |
| [invalid saved swipe counts return a fresh cart](../frontend/src/cart.test.js#L170) ×5 | Saved swipes of 0, −1, 1.5, `"2"` or `null` give an empty cart. |
| [missing or array items keep the swipes but empty the cart](../frontend/src/cart.test.js#L176) | A saved cart with bad items keeps its swipe count. |
| [cart summary lists items in menu order, not the order they were added](../frontend/src/cart.test.js#L183) | The cart list follows the menu's order. |
| [search matches dietary labels](../frontend/src/cart.test.js#L192) | Searching "vegan" finds exactly the Vegan items. |
| [an empty search with a category returns exactly that category](../frontend/src/cart.test.js#L198) | A category filter alone returns only that category. |

### Menu data: [menu-data.test.js](../frontend/src/menu-data.test.js)

Covers [menu-data.js](../frontend/src/menu-data.js), so that a menu edit can't silently break the page.

| Test | What it checks |
|---|---|
| [every item has a unique id](../frontend/src/menu-data.test.js#L10) | No two items share an id; the cart relies on ids. |
| [every item has a name, category, portion, and known swipe type](../frontend/src/menu-data.test.js#L15) | Required fields are filled in, and `swipeType` is Entry, Side or Drink. |
| [every swipe type has at least one item, so a full meal swipe is possible](../frontend/src/menu-data.test.js#L24) | Students can always complete a meal swipe. |
| [categories start with All, have no duplicates, and each has items](../frontend/src/menu-data.test.js#L30) | The category buttons make sense. |
| [every image file exists](../frontend/src/menu-data.test.js#L40) | Each item's photo is in `public/images/menu/`. |
| [every image is credited in CREDITS.md](../frontend/src/menu-data.test.js#L46) | Each photo has an attribution entry, as its license requires. |

### Supabase client helper: [supabase.test.js](../frontend/src/supabase.test.js)

Covers `getSupabase` in [supabase.js](../frontend/src/supabase.js). The real `@supabase/supabase-js` library is replaced with a fake, and the environment variables are set per test.

| Test | What it checks |
|---|---|
| [returns null when the URL is missing](../frontend/src/supabase.test.js#L22) | With no `SUPABASE_URL`, no client is created. |
| [returns null when the key is missing](../frontend/src/supabase.test.js#L31) | With no `SUPABASE_KEY`, no client is created. |
| [creates the client once and reuses it](../frontend/src/supabase.test.js#L39) | With both set, the client is created with the right URL and key, and later calls return the same client. |

### Login page: [Login.test.jsx](../frontend/src/Login.test.jsx)

Covers [Login.jsx](../frontend/src/Login.jsx). The tests render the page and use it like a person would: typing into fields and clicking buttons. `getSupabase` is replaced with a fake whose `signInWithPassword` and `signUp` each test controls, and `fetch` (used for the backend's `/api/me` check) is faked too.

#### Form validation

These run before anything is sent to Supabase.

| Test | What it checks |
|---|---|
| [requires email and password](../frontend/src/Login.test.jsx#L43) | Submitting an empty form shows "Enter your email." and "Enter your password.", marks the email field invalid, and doesn't call Supabase. |
| [rejects a badly formed email](../frontend/src/Login.test.jsx#L54) | An email like `not-an-email` shows "Enter a valid email address." |
| [requires the confirmation password on sign up](../frontend/src/Login.test.jsx#L64) | On Sign up, leaving "Confirm password" empty shows "Confirm your password." |
| [rejects mismatched passwords on sign up](../frontend/src/Login.test.jsx#L75) | On Sign up, two different passwords show "Passwords do not match." |

#### Form controls

| Test | What it checks |
|---|---|
| [shows and hides the password](../frontend/src/Login.test.jsx#L89) | The Show/Hide button switches the password between hidden and visible text. |
| [switches tabs and clears errors](../frontend/src/Login.test.jsx#L103) | Switching to Sign up clears existing errors and adds the "Confirm password" field and a "Create account" button; switching back removes the field. |
| [explains when Supabase is not configured](../frontend/src/Login.test.jsx#L121) | With no Supabase settings, submitting shows "Sign-in is not configured yet." and makes no request. |

#### Signing in

| Test | What it checks |
|---|---|
| [signs in and confirms the session with the backend](../frontend/src/Login.test.jsx#L151) | A successful sign-in trims spaces from the email, sends the token to `/api/me` as `Bearer <token>`, and shows "Signed in as …". |
| [shows a message for the … error](../frontend/src/Login.test.jsx#L169) ×3 | Supabase error codes show the right message: `invalid_credentials` → "Email or password is incorrect.", `email_not_confirmed` → "You need to confirm your email…", anything else → "Could not sign in. Try again." |
| [handles a response with no session and no error](../frontend/src/Login.test.jsx#L184) | If Supabase returns neither a session nor an error, the generic "Could not sign in" message appears. |
| [shows the backend error when the session cannot be confirmed](../frontend/src/Login.test.jsx#L194) | If `/api/me` fails, the backend's error message is shown and the "Signed in" message isn't. |
| [falls back to a generic message when the backend returns no JSON](../frontend/src/Login.test.jsx#L206) | If `/api/me` fails without a readable body, "The server could not confirm this sign-in." is shown. |
| [disables the submit button while signing in](../frontend/src/Login.test.jsx#L217) | While sign-in is in progress, the button reads "Signing in…" and can't be clicked; it's enabled again afterwards. |

#### Signing up

| Test | What it checks |
|---|---|
| [shows a message for the … error](../frontend/src/Login.test.jsx#L235) ×4 | Supabase error codes show the right message: `user_already_exists` and `email_exists` → "An account with this email already exists.", `weak_password` → "Use at least 6 characters.", anything else → "Could not create the account. Try again." |
| [sends the user to sign in when email confirmation is required](../frontend/src/Login.test.jsx#L254) | If Supabase creates the account without a session, the page switches to Sign in, keeps the email, clears the password, and shows "Account created. Sign in to continue." |
| [signs in immediately when Supabase returns a session](../frontend/src/Login.test.jsx#L268) | If Supabase returns a session right away, the page confirms it with `/api/me` and shows "Signed in as …". |

#### Callbacks to the app

| Test | What it checks |
|---|---|
| [reports the signed-in email after signing in](../frontend/src/Login.test.jsx#L284) | `onSignedIn` is called once with the email, so the app can open the menu. |
| [reports the signed-in email after a sign-up that returns a session](../frontend/src/Login.test.jsx#L297) | The same happens after a sign-up that signs the user in right away. |
| [does not report a sign-in that Supabase rejects](../frontend/src/Login.test.jsx#L310) | A failed sign-in doesn't open the menu. |
| [does not report a sign-in the backend cannot confirm](../frontend/src/Login.test.jsx#L322) | If `/api/me` fails, the menu isn't opened. |
| [shows Browse sample menu only when the app provides it](../frontend/src/Login.test.jsx#L335) | The button appears and calls `onBrowse`. |
| [hides Browse sample menu without a handler](../frontend/src/Login.test.jsx#L344) | Without `onBrowse`, there's no button. |
| [disables Browse sample menu while signing in](../frontend/src/Login.test.jsx#L350) | The user can't leave mid-sign-in. |

### Menu page: [Menu.test.jsx](../frontend/src/Menu.test.jsx)

Covers [Menu.jsx](../frontend/src/Menu.jsx) using the real cart rules and menu data. Browser storage is cleared before each test.

| Test | What it checks |
|---|---|
| [shows every menu item](../frontend/src/Menu.test.jsx#L35) | All items are listed with the right count. |
| [filters by category](../frontend/src/Menu.test.jsx#L42) | A category button shows only that category and updates the results text. |
| [searches without caring about case](../frontend/src/Menu.test.jsx#L53) | Searching "FRIES" finds the fries items. |
| [shows a reset option when nothing matches](../frontend/src/Menu.test.jsx#L62) | "No matches this time." appears, and **Reset filters** brings everything back. |
| [falls back to a placeholder when an image fails to load](../frontend/src/Menu.test.jsx#L77) | A broken photo is replaced with a "No image" placeholder. |
| [adds an item and updates the cart, header count, and notice](../frontend/src/Menu.test.jsx#L88) | Adding updates the cart, the header's cart count, and the announcement. |
| [shows how many of an item are in the cart while more can be added](../frontend/src/Menu.test.jsx#L99) | The add button shows "1 in cart". |
| [blocks more items of a full type but not other types](../frontend/src/Menu.test.jsx#L108) | After one Entry on one swipe, other Entries show "Entry limit reached"; Sides and Drinks stay available. |
| [shows progress for each part of a meal swipe](../frontend/src/Menu.test.jsx#L119) | Entries, Sides and Drinks each show 1/1. |
| [cannot go below one swipe](../frontend/src/Menu.test.jsx#L133) | The − button is disabled at 1 swipe. |
| [raising swipes allows another item of the same type](../frontend/src/Menu.test.jsx#L140) | A second swipe re-enables Entries. |
| [cannot drop below the number of items of the busiest type](../frontend/src/Menu.test.jsx#L150) | With 2 Entries, swipes can't go below 2. |
| [stops at 10 swipes](../frontend/src/Menu.test.jsx#L160) | The + button is disabled at the maximum. |
| [changes quantity within the swipe allowance](../frontend/src/Menu.test.jsx#L174) | Cart +/− change the quantity, and + stops at the limit. |
| [decreasing to zero empties the cart](../frontend/src/Menu.test.jsx#L189) | Removing the last item shows the empty cart. |
| [removes a single item](../frontend/src/Menu.test.jsx#L198) | **Remove** takes out one item and leaves the rest. |
| [clears the whole cart](../frontend/src/Menu.test.jsx#L210) | **Clear cart** empties it and announces "Cart cleared." |
| [saves changes to browser storage](../frontend/src/Menu.test.jsx#L224) | The cart is saved to localStorage after each change. |
| [restores a saved cart](../frontend/src/Menu.test.jsx#L233) | A saved cart is shown when the page opens. |
| [starts empty when the saved cart is corrupt](../frontend/src/Menu.test.jsx#L242) | Broken saved data gives an empty cart instead of an error. |
| [explains when browser storage is unavailable](../frontend/src/Menu.test.jsx#L251) | If saving fails (e.g. private browsing), the page says the cart won't be kept. |
| [shows the signed-in email and a way back to login](../frontend/src/Menu.test.jsx#L263) | Signed-in users see their email, and **Back to login** works. |
| [offers sign in when browsing without an account](../frontend/src/Menu.test.jsx#L274) | Guests see **Sign in** instead. |
| [the cart link moves focus to the cart](../frontend/src/Menu.test.jsx#L281) | The header's Cart link scrolls to the cart and focuses its heading. |
| [the skip link moves focus to the menu](../frontend/src/Menu.test.jsx#L291) | The "Skip to menu" link works for keyboard users. |

### Page switching: [App.test.jsx](../frontend/src/App.test.jsx)

Covers [App.jsx](../frontend/src/App.jsx), which switches between the login page and the menu using the address (`#menu` / `#login`).

| Test | What it checks |
|---|---|
| [starts on the login page](../frontend/src/App.test.jsx#L28) | With no `#` in the address, the login page shows. |
| [opens the menu directly when the address ends in #menu](../frontend/src/App.test.jsx#L35) | A link or bookmark to `#menu` opens the menu. |
| [Browse sample menu opens the menu and updates the address](../frontend/src/App.test.jsx#L43) | The button opens the menu and sets `#menu`. |
| [Sign in on the menu returns to the login page](../frontend/src/App.test.jsx#L53) | The menu's **Sign in** goes back to login and sets `#login`. |
| [follows address changes such as the browser back button](../frontend/src/App.test.jsx#L64) | Changing the address switches pages. |

### Integration: sign in to menu: [signin-flow.test.jsx](../frontend/src/signin-flow.test.jsx)

The real App, Login, Menu, cart rules and browser storage working together. Only Supabase and `/api/me` are faked.

| Test | What it checks |
|---|---|
| [signs in, opens the menu, and keeps the cart across pages](../frontend/src/signin-flow.test.jsx#L38) | Sign in → the menu opens with "Signed in as …" → an added item is saved → going back to login and browsing again shows the same cart. |
| [stays on the login page when the backend rejects the session](../frontend/src/signin-flow.test.jsx#L59) | If the backend rejects the login, the user stays on the login page and sees the error. |

### Contract with the backend: [vite-config.test.js](../frontend/src/vite-config.test.js)

Checks the dev-server settings the frontend needs to reach the backend. A wrong port here broke sign-in during Sprint 2.

| Test | What it checks |
|---|---|
| [targets the backend on port 8001](../frontend/src/vite-config.test.js#L10) | `/api` requests go to `127.0.0.1:8001`, where the backend runs. |
| [strips only the leading /api from request paths](../frontend/src/vite-config.test.js#L14) | `/api/me` becomes `/me`, and only the first `/api` is removed. |
| [reads .env from the repo root, like the backend](../frontend/src/vite-config.test.js#L22) | Both halves share one `.env` file. |
| [only exposes SUPABASE_ variables to the browser](../frontend/src/vite-config.test.js#L27) | Other settings, such as test passwords, never reach the browser. |

## E2E (Playwright)

Location: [frontend/e2e/](../frontend/e2e/). Run with `npm run test:e2e` from `frontend/`. Playwright starts the Vite dev server itself; with test credentials set, it also starts the backend on port 8001. Configuration is in [playwright.config.js](../frontend/playwright.config.js). Each test gets a fresh browser profile, so carts don't carry between tests.

| Test | What it checks |
|---|---|
| [the app loads on the login page](../frontend/e2e/smoke.spec.js#L3) | The app starts and shows the login page and **Browse sample menu**. |
| [a student browses the menu, fills a meal swipe, and keeps the cart after a reload](../frontend/e2e/menu-cart.spec.js#L7) | Browse → add an Entry, Side and Drink → each shows 1/1 → reload the page → the cart is still there. |
| [search and category filters narrow the menu and can be reset](../frontend/e2e/menu-cart.spec.js#L30) | A search with no results shows **Reset filters**, which brings back every item. |
| [meal swipes limit each part of the meal and can be raised](../frontend/e2e/swipe-limits.spec.js#L3) | A second Entry is blocked → adding a swipe allows it → swipes can't drop below what's in the cart → clearing the cart frees them. |
| [a student signs in and lands on the menu](../frontend/e2e/sign-in.spec.js#L8) | A real sign-in through Supabase and the backend opens the menu with "Signed in as …". Skipped without test credentials. |

## Not covered yet

- **Ordering, checkout and the kitchen view:** not built yet. TEST_PLAN.md lists the journeys to add once they exist.
- **The "Sign in with SSO" button,** which has no behavior yet.
- **A network failure when calling `/api/me`.** The page currently shows the browser's raw error text (e.g. "Failed to fetch").

When you add or change a test, update this page too.
