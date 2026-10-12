# Tests

This page lists every automated test in the project: where it is and what it checks. For how to run the tests, see [Running tests](../README.md#running-tests) in the README.

**Totals:** 16 backend tests (pytest) and 24 frontend tests (Vitest + React Testing Library). Tests marked "×N" run once per input listed.

**Supabase is always faked.** No test talks to a real Supabase project, so the tests need no `.env` file, network connection or test accounts. GitHub Actions ([.github/workflows/tests.yml](../.github/workflows/tests.yml)) runs both suites on every pull request and push to `main`.

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

## Frontend

Location: [frontend/src/](../frontend/src/), in files ending in `.test.js` or `.test.jsx`. Run with `npm test` from `frontend/`.

### Shared setup: [test/setup.js](../frontend/src/test/setup.js)

Contains no tests. Vitest runs it before every test file (configured in the `test` block of [vite.config.js](../frontend/vite.config.js)). It adds DOM checks such as `toBeInTheDocument()` and `toBeDisabled()`, and clears the rendered page after each test. Tests run in `jsdom`, a simulated browser.

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

## Not covered yet

- **Browser end-to-end tests** against a real Supabase project. These are planned (with Playwright) once the menu, cart and order flow exist.
- **The "Sign in with SSO" button,** which has no behavior yet.
- **A network failure when calling `/api/me`.** The page currently shows the browser's raw error text (e.g. "Failed to fetch").

When you add or change a test, update this page too.
