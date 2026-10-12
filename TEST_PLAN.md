# Test Plan — Pub-Order

**Sprint:** 3 · **Owner:** _TBD (Test Lead)_

## Baseline (2026-10-08)

**Tests:** 52 passing, 0 failing.
- `main`: 16 pytest (backend) + 24 Vitest (frontend)
- `feature/menu-and-cart`: 12 cart tests (`node --test`)

**Branch coverage:**

| Suite | Branch coverage | Least covered (branches) |
|---|---|---|
| Backend (`app/`) | 83.3% (5/6) | `auth.py` 83.3%: the 19 → 24 branch (creating the real Supabase client) never runs because tests stub it |
| Frontend (`src/`, Vitest) | 96.9% (95/98) | `Login.jsx` 96.7% |
| Cart (`cart.js`, node:test) | 95.8% | — |

**Levels today:** unit and component tests only. API tests run in-process with Supabase stubbed. There are no real integration tests and no E2E tests.

## Targets

- Branch coverage **≥ 70% overall**, kept as new code is added (course minimum: 60%).
- **≥ 85%** on the core modules: `backend/app/auth.py`, `frontend/src/cart.js`, and the order module once it exists.
- At least one **integration test per seam** below before the matching feature merges.

## Priorities (from risk map)

Likelihood (L) and impact (I) are scored 1–3 each; priority = L × I.

| Feature | L | I | Priority | Unit | Integration | E2E | Owner |
|---|---|---|---|---|---|---|---|
| Order placement + mock payment (planned) | 3 | 3 | **9** | ✓ | ✓ | ✓ | TBD |
| Kitchen-staff role and permissions (planned) | 3 | 3 | **9** | ✓ | ✓ | ✓ | TBD |
| Sign up / sign in (Supabase + `/me`) | 3 | 3 | **9** | ✓ (done) | ✓ | ✓ | TBD |
| Cart and meal-swipe rules (`cart.js`) | 2 | 3 | **6** | ✓ (done) | ✓ | via order journey | TBD |
| Backend token check on protected routes | 2 | 3 | **6** | ✓ (done) | ✓ | — | TBD |
| Order status tracking (planned) | 2 | 2 | **4** | ✓ | ✓ | via staff journey | TBD |
| Menu browsing and search | 1 | 2 | **2** | ✓ (done) | when the menu moves to Supabase | — | TBD |
| Cart saved across page refresh (localStorage) | 2 | 1 | **2** | ✓ (done) | — | — | TBD |

## Integration seams to test

- **Frontend → FastAPI JSON contract:** request and response shapes for `/me` and the future `/menu` and `/orders`.
- **FastAPI → Supabase Auth:** a real token from a Supabase *test* project, verified by `get_current_user`.
- **FastAPI route → order logic → Supabase database:** placing an order writes the order and its items, and enforces the meal-swipe limit on the server too.
- **Role check → protected route:** a student token gets 403 on staff-only routes; a staff token succeeds.

## Critical E2E journeys (max 3)

1. **Student orders:** sign in → browse the menu → fill one meal swipe → place the order → see confirmation.
2. **Kitchen updates an order:** staff signs in → sees the new order → marks it ready → the student sees "ready".
3. **Access control:** a student cannot open or use kitchen-staff pages.

## Not testing (and why)

- **Supabase's own sign-up, sign-in and email delivery:** covered by the provider. We stub it in unit tests and make one real call per integration seam.
- **Visual styling and layout:** checked by hand during review, since automated visual tests aren't worth the cost at this size.
- **"Sign in with SSO":** only a placeholder. Vanderbilt SSO is a stretch goal.
- **Menu photos:** static files with no logic.
- **Hosting and deployment:** not set up yet. We'll add a smoke test once it exists.
- **Load and performance:** usage is small for a class project.

## How to run

```sh
# Backend (from backend/, venv active)
pytest -m "not integration"
pytest -m integration          # needs PUB_ORDER_TEST_EMAIL / PUB_ORDER_TEST_PASSWORD in .env
pytest --cov=app --cov-branch --cov-report=term-missing

# Frontend (from frontend/)
npm test
npm run coverage
npm run test:cart              # cart rules only
npm run test:e2e               # Playwright; first run: npx playwright install chromium
```
