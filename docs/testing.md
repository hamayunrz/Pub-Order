# Tests

This page lists every automated test in the project: where it is and what it checks. For how to run the tests, see [Running tests](../README.md#running-tests) in the README.

**Totals:**
- **Backend (pytest):** 56 tests, 3 of them integration tests
- **Frontend (Vitest + React Testing Library):** 123 tests
- **E2E (Playwright):** 7 tests
- **Database (SQL):** one migration check script

Tests marked "×N" run once per input listed.

| Level | What it means here | Where |
|---|---|---|
| **Unit and component** | One function or component, with Supabase and `fetch` faked | `backend/tests/`, `frontend/src/*.test.js(x)` |
| **Integration** | Several real pieces together. Some fake only the outside services; others call a **real Supabase project** | `frontend/src/signin-flow.integration.test.jsx`, the contract tests, `backend/tests/integration/` |
| **Database** | The menu migration applied to a throwaway PostgreSQL database, checking its data and permissions | `supabase/tests/menu_items.sql` |
| **E2E** | The real app in a real browser (Chromium), started with the Vite dev server. Menu journeys answer `/api/menu` with the seed menu; the sign-in journey uses the real backend | `frontend/e2e/` |

**Real Supabase is only used when test credentials are set.** Most tests fake Supabase and need no `.env`, network or accounts. The backend integration tests and the sign-in E2E journey run only when `PUB_ORDER_TEST_EMAIL` and `PUB_ORDER_TEST_PASSWORD` are set; otherwise they are skipped.

GitHub Actions ([.github/workflows/tests.yml](../.github/workflows/tests.yml)) runs the backend, frontend, E2E and menu-schema jobs on every pull request and every push to `main`. The backend and frontend jobs fail if branch coverage drops below 70%.

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

### Menu and checkout review: [test_menu_checkout.py](../backend/tests/test_menu_checkout.py)

Covers `GET /menu` and `POST /checkout/review` in [app/menu.py](../backend/app/menu.py). The database is a fake (`MagicMock`), and sign-in is overridden where a test needs a signed-in student.

| Test | What it checks |
|---|---|
| [`test_public_menu_reads_database_and_maps_fields`](../backend/tests/test_menu_checkout.py#L39) | `/menu` reads the `menu_items` table and returns items in the shape the frontend expects (`swipeType`, `available`, …). |
| [`test_empty_menu`](../backend/tests/test_menu_checkout.py#L46) | An empty table returns an empty list. |
| [`test_unavailable_items_remain_visible`](../backend/tests/test_menu_checkout.py#L51) | Unavailable items are still listed, marked `available: false`. |
| [`test_database_failure_is_sanitized`](../backend/tests/test_menu_checkout.py#L56) | A database error returns 503 without leaking its details. |
| [`test_malformed_catalog_fails_closed`](../backend/tests/test_menu_checkout.py#L63) | A row with an invalid swipe type makes `/menu` fail rather than return bad data. |
| [`test_guest_cannot_review`](../backend/tests/test_menu_checkout.py#L68) | Checkout review without sign-in gets 401 and never reads the database. |
| [`test_invalid_token_cannot_review`](../backend/tests/test_menu_checkout.py#L73) | An invalid token gets 401. |
| [`test_valid_meal_uses_database_values_and_never_writes`](../backend/tests/test_menu_checkout.py#L79) | A complete meal is accepted using the database's values, and nothing is written. |
| [`test_invalid_quantities`](../backend/tests/test_menu_checkout.py#L94) ×7 | Quantities of 0, −1, 1.5, `"1"`, `true`, 11 or `null` are rejected with 422. |
| [`test_invalid_swipe_counts`](../backend/tests/test_menu_checkout.py#L101) ×7 | The same invalid values are rejected as a swipe count. |
| [`test_empty_and_duplicate_carts`](../backend/tests/test_menu_checkout.py#L106) | Empty carts and carts listing an item twice are rejected. |
| [`test_catalog_changes_block_checkout`](../backend/tests/test_menu_checkout.py#L113) ×3 | A deleted, unavailable or reclassified item blocks checkout with an issue for that item. |
| [`test_complete_two_swipe_meal`](../backend/tests/test_menu_checkout.py#L125) | Two of each part on two swipes passes. |
| [`test_under_and_over_filled_meals`](../backend/tests/test_menu_checkout.py#L132) | Too few or too many of one part fails with a composition issue. |
| [`test_review_fails_without_database`](../backend/tests/test_menu_checkout.py#L141) | A database outage during review returns 503. |
| [`test_extra_client_fields_rejected`](../backend/tests/test_menu_checkout.py#L146) | Extra fields sent by the browser are rejected with 422. |

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

Covers [cart.js](../frontend/src/cart.js), which enforces the meal-swipe rules: each swipe covers one Entry, one Side and one Drink, up to 10 swipes. Every function takes the current menu, and changes that break a rule are rejected (the cart is returned unchanged). The first 14 tests came from the menu-and-checkout work; the rest are boundary and edge cases. `npm run test:cart` runs this file alone.

| Test | What it checks |
|---|---|
| [one swipe holds exactly one entry, side, and drink](../frontend/src/cart.test.js#L7) | One of each type on one swipe, and that cart passes review. |
| [database-only IDs work without changes to frontend constants](../frontend/src/cart.test.js#L14) | Items that exist only in the database can be added. |
| [entry capacity is enforced and milkshakes remain entries](../frontend/src/cart.test.js#L18) | Milkshakes use the Entry slot, and a second Entry on one swipe is rejected. |
| [removing an item is immutable and can remove a deleted catalog ID](../frontend/src/cart.test.js#L23) | Removing works even for items no longer on the menu, and the original cart isn't changed. |
| [more swipes unlock quantities and cannot be reduced below usage](../frontend/src/cart.test.js#L28) | More swipes allow more items; swipes can't drop below what's in the cart. |
| [invalid swipe counts are rejected rather than silently rounded or capped](../frontend/src/cart.test.js#L33) | 0, −1, 1.5, `"2"`, `true`, `NaN` and 11 leave the cart unchanged. |
| [invalid quantities and unknown or unavailable items are rejected](../frontend/src/cart.test.js#L38) | Bad quantities, unknown items and unavailable items leave the cart unchanged. |
| [cart restoration retains removed IDs and original reviewed types](../frontend/src/cart.test.js#L44) | A saved cart keeps items that have left the menu, so the student can see and remove them. |
| [corrupt storage and invalid shapes return a fresh cart](../frontend/src/cart.test.js#L49) | Broken or unexpected saved data gives an empty one-swipe cart. |
| [restoration rejects invalid quantities and dangerous property names](../frontend/src/cart.test.js#L52) | Bad quantities and names like `__proto__` are dropped. |
| [search combines categories with case-insensitive trimmed queries](../frontend/src/cart.test.js#L55) | Search and category filters work together. |
| [empty, incomplete, over-capacity, and invalid carts cannot pass review](../frontend/src/cart.test.js#L60) | Each kind of bad cart produces review errors. |
| [unavailable items fail review](../frontend/src/cart.test.js#L63) | An unavailable item blocks review. |
| [quantity edits preserve original classification for server change detection](../frontend/src/cart.test.js#L66) | The swipe type the student saw is kept, so the server can spot menu changes. |
| [zero removes the item, one keeps it, and negative is rejected](../frontend/src/cart.test.js#L79) | Boundary values 0, 1 and −1. |
| [quantities just below and at the swipe count are accepted, just above is rejected](../frontend/src/cart.test.js#L86) | With 3 swipes: 2 and 3 are accepted, 4 is rejected. |
| [other items of the same type shrink the allowance](../frontend/src/cart.test.js#L93) | Other Entries reduce what's left; a full type rejects more. |
| [an item does not count against its own allowance](../frontend/src/cart.test.js#L102) | Re-setting an item's quantity isn't blocked by itself. |
| [MAX_SWIPES is reachable but one more is rejected](../frontend/src/cart.test.js#L108) | With 10 swipes, 10 is accepted and 11 rejected. |
| [MAX_SWIPES itself is accepted](../frontend/src/cart.test.js#L116) | Swipes can be set to exactly 10. |
| [swipes can drop to exactly the busiest type but not below it](../frontend/src/cart.test.js#L120) | With 2 Entries, swipes can go to 2 but not 1. |
| [does not modify the original cart](../frontend/src/cart.test.js#L126) | `setSwipes` returns a new cart. |
| [1 and MAX_SWIPES are restored; 0 and one more give a fresh cart](../frontend/src/cart.test.js#L134) | Saved swipe counts at and just outside the 1–10 range. |
| [invalid saved swipe counts give a fresh cart](../frontend/src/cart.test.js#L141) | Saved swipes of −1, 1.5, `"2"` or `null` give an empty cart. |
| [missing or array items give a fresh cart](../frontend/src/cart.test.js#L147) | A saved cart without a valid item list is discarded. |
| [item ids up to 100 characters are kept; longer ids are dropped](../frontend/src/cart.test.js#L152) | The 100-character id limit, at and just over. |
| [keeps reviewed types only for items in the cart and only valid types](../frontend/src/cart.test.js#L158) | Stale or invalid saved swipe types are dropped. |
| [items no longer on the menu are listed but do not count toward a meal](../frontend/src/cart.test.js#L165) | Removed items show as unavailable and don't fill a meal slot. |
| [search matches dietary labels](../frontend/src/cart.test.js#L172) | Searching "vegan" finds exactly the Vegan items. |
| [an empty search with a category returns exactly that category](../frontend/src/cart.test.js#L178) | A category filter alone returns only that category. |
| [a complete two-swipe meal passes review](../frontend/src/cart.test.js#L184) | Two of each part on two swipes has no errors. |
| [review explains which part of the meal is short](../frontend/src/cart.test.js#L189) | A missing drink produces exactly one clear message. |

### Menu data: [menu-data.test.js](../frontend/src/menu-data.test.js)

Covers [menu-data.js](../frontend/src/menu-data.js), the seed menu that the database migration and the tests use, so that an edit can't silently break it.

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
| [shows Browse menu only when the app provides it](../frontend/src/Login.test.jsx#L335) | The button appears and calls `onBrowse`. |
| [hides Browse menu without a handler](../frontend/src/Login.test.jsx#L344) | Without `onBrowse`, there's no button. |
| [disables Browse menu while signing in](../frontend/src/Login.test.jsx#L350) | The user can't leave mid-sign-in. |

### Menu page and checkout review: [Menu.test.jsx](../frontend/src/Menu.test.jsx)

Covers loading the menu from `/api/menu`, [Menu.jsx](../frontend/src/Menu.jsx) and [Checkout.jsx](../frontend/src/Checkout.jsx), with a small three-item menu. Supabase and `fetch` are faked.

| Test | What it checks |
|---|---|
| [shows loading, then database items and combined search/category filters](../frontend/src/Menu.test.jsx#L37) | "Loading menu…" first, then the items; search and category filters combine, and Reset filters works. |
| [shows empty catalog and disables empty checkout](../frontend/src/Menu.test.jsx#L50) | An empty menu shows a message and checkout is disabled. |
| [shows a failed menu request and retries successfully](../frontend/src/Menu.test.jsx#L55) | A failed load shows **Retry menu**, which works. |
| [rejects malformed menu responses](../frontend/src/Menu.test.jsx#L60) | A bad response from `/api/menu` shows an error instead of broken items. |
| [cannot add unavailable items](../frontend/src/Menu.test.jsx#L64) | Unavailable items can't be added. |
| [shows quantities and total, checks server, and retains cart after success](../frontend/src/Menu.test.jsx#L68) | Checkout review shows the meal, sends it to the server with the login token, and keeps the cart. |
| [blocks empty, invalid, or incomplete checkout](../frontend/src/Menu.test.jsx#L79) ×6 | Bad or incomplete carts can't be validated, and nothing is sent. |
| [asks guest to sign in without discarding cart](../frontend/src/Menu.test.jsx#L83) | Guests are asked to sign in, and the cart stays. |
| [expired server session requires sign-in](../frontend/src/Menu.test.jsx#L90) | A 401 from the server asks the student to sign in again. |
| [blocks changed types and unavailable items until reviewed](../frontend/src/Menu.test.jsx#L95) | Menu changes found by the server must be reviewed before continuing. |
| [handles failed validation and allows retry](../frontend/src/Menu.test.jsx#L107) | A failed check shows the error and can be retried. |
| [ignores stale validation response after cart changes](../frontend/src/Menu.test.jsx#L114) | A slow answer for an old cart is ignored. |
| [preserves checkout through login navigation when storage is blocked](../frontend/src/Menu.test.jsx#L123) | Signing in from checkout keeps the review, even with browser storage blocked. |
| [builds a meal through clicks and the header returns from checkout to cart](../frontend/src/Menu.test.jsx#L137) | A meal built by clicking can be reviewed, and the header Cart button returns to the cart. |
| [refreshes catalog without dropping a saved cart or its reviewed classifications](../frontend/src/Menu.test.jsx#L150) | **Refresh menu** keeps the cart and marks newly unavailable items. |

### Menu page with the full menu: [Menu.cart.test.jsx](../frontend/src/Menu.cart.test.jsx)

Covers browsing and building a cart in [Menu.jsx](../frontend/src/Menu.jsx) with the full seed menu served as `/api/menu`. Browser storage is cleared before each test.

| Test | What it checks |
|---|---|
| [shows every menu item](../frontend/src/Menu.cart.test.jsx#L42) | All items from the menu are listed with the right count. |
| [builds the category buttons from the menu and filters by category](../frontend/src/Menu.cart.test.jsx#L49) | Category buttons come from the menu; one shows only its items. |
| [falls back to a placeholder when an image fails to load](../frontend/src/Menu.cart.test.jsx#L60) | A broken photo is replaced with a "No image" placeholder. |
| [adds an item and updates the cart, header count, and notice](../frontend/src/Menu.cart.test.jsx#L71) | Adding updates the cart, the header's cart count, and the announcement. |
| [shows how many of an item are in the cart while more can be added](../frontend/src/Menu.cart.test.jsx#L82) | The add button shows "1 in cart". |
| [blocks more items of a full type but not other types](../frontend/src/Menu.cart.test.jsx#L91) | After one Entry on one swipe, other Entries show "Entry limit reached"; Sides and Drinks stay available. |
| [shows progress for each part of a meal swipe](../frontend/src/Menu.cart.test.jsx#L102) | Entries, Sides and Drinks each show 1/1. |
| [cannot go below one swipe](../frontend/src/Menu.cart.test.jsx#L116) | The − button is disabled at 1 swipe. |
| [raising swipes allows another item of the same type](../frontend/src/Menu.cart.test.jsx#L123) | A second swipe re-enables Entries. |
| [cannot drop below the number of items of the busiest type](../frontend/src/Menu.cart.test.jsx#L133) | With 2 Entries, swipes can't go below 2. |
| [stops at 10 swipes](../frontend/src/Menu.cart.test.jsx#L143) | The + button is disabled at the maximum. |
| [changes quantity within the swipe allowance](../frontend/src/Menu.cart.test.jsx#L157) | Cart +/− change the quantity, and + stops at the limit. |
| [decreasing to zero empties the cart](../frontend/src/Menu.cart.test.jsx#L172) | Removing the last item shows the empty cart. |
| [removes a single item](../frontend/src/Menu.cart.test.jsx#L181) | **Remove** takes out one item and leaves the rest. |
| [clears the whole cart](../frontend/src/Menu.cart.test.jsx#L193) | **Clear cart** empties it, announces it, and saves the empty cart. |
| [saves changes to browser storage](../frontend/src/Menu.cart.test.jsx#L208) | The cart is saved to localStorage after each change. |
| [restores a saved cart](../frontend/src/Menu.cart.test.jsx#L217) | A saved cart is shown when the page opens. |
| [starts empty when the saved cart is corrupt](../frontend/src/Menu.cart.test.jsx#L226) | Broken saved data gives an empty cart instead of an error. |
| [explains when browser storage is unavailable](../frontend/src/Menu.cart.test.jsx#L235) | If saving fails (e.g. private browsing), the page says so. |
| [shows the signed-in email and a way back to login](../frontend/src/Menu.cart.test.jsx#L247) | Signed-in users see their email, and **Back to login** works. |
| [offers sign in when browsing without an account](../frontend/src/Menu.cart.test.jsx#L258) | Guests see **Sign in** instead. |
| [the header cart button moves focus to the cart](../frontend/src/Menu.cart.test.jsx#L265) | The header's Cart button focuses the cart heading. |
| [the skip link moves focus to the menu](../frontend/src/Menu.cart.test.jsx#L273) | The "Skip to menu" link works for keyboard users. |

### Page switching: [App.test.jsx](../frontend/src/App.test.jsx)

Covers [App.jsx](../frontend/src/App.jsx), which switches between the login page and the menu using the address (`#menu` / `#login`). The menu stays loaded in the background so the cart survives a trip to the login page.

| Test | What it checks |
|---|---|
| [starts on the login page](../frontend/src/App.test.jsx#L30) | With no `#` in the address, the login page shows. |
| [opens the menu directly when the address ends in #menu](../frontend/src/App.test.jsx#L37) | A link or bookmark to `#menu` opens the menu. |
| [Browse menu opens the menu and updates the address](../frontend/src/App.test.jsx#L45) | The button opens the menu and sets `#menu`. |
| [Sign in on the menu returns to the login page](../frontend/src/App.test.jsx#L55) | The menu's **Sign in** goes back to login and sets `#login`. |
| [follows address changes such as the browser back button](../frontend/src/App.test.jsx#L66) | Changing the address switches pages. |

### Integration: sign in to menu: [signin-flow.integration.test.jsx](../frontend/src/signin-flow.integration.test.jsx)

The real App, Login, Menu, cart rules and browser storage working together. Only Supabase, `/api/menu` and `/api/me` are faked.

| Test | What it checks |
|---|---|
| [signs in, opens the menu, and keeps the cart across pages](../frontend/src/signin-flow.integration.test.jsx#L51) | Sign in → the menu opens with "Signed in as …" → an added item is saved → going back to login and browsing again shows the same cart. |
| [stays on the login page when the backend rejects the session](../frontend/src/signin-flow.integration.test.jsx#L71) | If the backend rejects the login, the user stays on the login page and sees the error. |

### Contract with the backend: [vite-config.test.js](../frontend/src/vite-config.test.js)

Checks the dev-server settings the frontend needs to reach the backend. A wrong port here broke sign-in during Sprint 2.

| Test | What it checks |
|---|---|
| [targets the backend on port 8001](../frontend/src/vite-config.test.js#L10) | `/api` requests go to `127.0.0.1:8001`, where the backend runs. |
| [strips only the leading /api from request paths](../frontend/src/vite-config.test.js#L14) | `/api/me` becomes `/me`, and only the first `/api` is removed. |
| [reads .env from the repo root, like the backend](../frontend/src/vite-config.test.js#L22) | Both halves share one `.env` file. |
| [only exposes SUPABASE_ variables to the browser](../frontend/src/vite-config.test.js#L27) | Other settings, such as test passwords, never reach the browser. |

## Database: [supabase/tests/menu_items.sql](../supabase/tests/menu_items.sql)

The `menu-schema` CI job applies [the menu migration](../supabase/migrations/202610120001_menu_items.sql) to a throwaway PostgreSQL 16 database and runs this script. It checks that the 22 seed items exist (11 counted as entrées), that invalid swipe types are refused, that row-level security is on, and that guests and students can read the menu but not change it. It runs inside a transaction, so nothing is left behind.

## E2E (Playwright)

Location: [frontend/e2e/](../frontend/e2e/). Run with `npm run test:e2e` from `frontend/`. Playwright starts the Vite dev server itself; with test credentials set, it also starts the backend on port 8001. Configuration is in [playwright.config.js](../frontend/playwright.config.js). Each test gets a fresh browser profile, so carts don't carry between tests. [menu-fixture.js](../frontend/e2e/menu-fixture.js) answers the browser's `/api/menu` request with the seed menu, so the menu journeys don't need the backend or database.

| Test | What it checks |
|---|---|
| [the app loads on the login page](../frontend/e2e/smoke.spec.js#L4) | The app starts and shows the login page and **Browse menu**. |
| [a student browses the menu, fills a meal swipe, and keeps the cart after a reload](../frontend/e2e/menu-cart.spec.js#L12) | Browse → add an Entry, Side and Drink → each shows 1/1 → reload the page → the cart is still there. |
| [search and category filters narrow the menu and can be reset](../frontend/e2e/menu-cart.spec.js#L35) | A search with no results shows **Reset filters**, which brings back every item. |
| [meal swipes limit each part of the meal and can be raised](../frontend/e2e/swipe-limits.spec.js#L4) | A second Entry is blocked → adding a swipe allows it → swipes can't drop below what's in the cart → clearing the cart frees them. |
| [a guest reviews a full meal and is asked to sign in without losing it](../frontend/e2e/checkout.spec.js#L9) | Build a meal → Review checkout → Validate → asked to sign in → go to login and back → the review and cart are still there. |
| [an incomplete meal cannot be validated and says what is missing](../frontend/e2e/checkout.spec.js#L29) | An Entry alone shows which parts are missing, and Validate is disabled. |
| [a student signs in and lands on the menu](../frontend/e2e/sign-in.spec.js#L8) | A real sign-in through Supabase and the backend opens the menu with "Signed in as …". Skipped without test credentials. |

## Not covered yet

- **Placing orders and the kitchen view:** not built yet. Checkout review only validates the meal; TEST_PLAN.md lists the journeys to add once ordering exists.
- **A signed-in checkout review end to end:** needs a test user and the menu table in the test Supabase project.
- **The "Sign in with SSO" button,** which has no behavior yet.
- **A network failure when calling `/api/me`.** The page currently shows the browser's raw error text (e.g. "Failed to fetch").

When you add or change a test, update this page too.
