# Pub-Order

Pub-Order is a web application designed to make ordering food from Vanderbilt's Pub faster and more convenient for students.

The goal of the project is to allow students to view available menu items, place an order, and track their pickup status without having to wait in line.

## Features

- Student login and authentication
- View current menu items
- Add items to a cart
- Place food orders
- View order status
- Estimated wait times
- Simple interface designed for Vanderbilt students

## Tech Stack

### Frontend
- React (Vite)

### Backend
- FastAPI
- Python

### Database and Authentication
- Supabase
- Supabase Auth

## Project Structure

```text
frontend/       React app (Vite)
  src/          App entry point and components
backend/        FastAPI app
  app/          Python application package
docs/diagrams/  UML diagrams
```

## Run locally

First, copy `.env.example` to `.env` in the repo root and fill in the Supabase URL and anon key.

Frontend (Node.js 22.12+):

```sh
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Backend (Python 3.10+), in a separate terminal. It must run on port 8001, because the frontend forwards `/api` requests there.

```sh
cd backend
python -m venv .venv            # macOS/Linux: python3 -m venv .venv
.venv\Scripts\Activate.ps1      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

You only need to create the venv and run `pip install` the first time. After that, activate the venv and start `uvicorn`.

If Windows says running scripts is disabled when you activate the venv, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

The frontend opens on the login page. The backend's API docs (Swagger) are at http://127.0.0.1:8001/docs.

## Running tests

Most tests replace Supabase with a fake, so they don't need a `.env` file or a network connection.

Backend (pytest), from `backend/` with the virtual environment active:

```sh
pip install -r requirements-dev.txt
pytest                                    # everything; integration tests skip without credentials
pytest -m "not integration"               # unit tests only
pytest --cov=app --cov-branch --cov-report=term-missing
```

Frontend (Vitest and React Testing Library), from `frontend/`:

```sh
npm test            # run once
npm run test:watch  # rerun on file changes
npm run coverage    # with branch coverage (fails below 70%)
```

End-to-end (Playwright), from `frontend/`. The first time, download the browser with `npx playwright install chromium`.

```sh
npm run test:e2e    # starts the dev server itself
```

**Real Supabase tests.** The backend integration tests and the sign-in E2E journey run only when a confirmed Supabase test user is set in the root `.env`:

```
PUB_ORDER_TEST_EMAIL=...
PUB_ORDER_TEST_PASSWORD=...
```

These names deliberately don't start with `SUPABASE_`, because the frontend sends every `SUPABASE_*` value to the browser.

GitHub Actions runs the backend, frontend and E2E tests on every pull request and push to `main`. To run the real Supabase tests there, add `SUPABASE_URL`, `SUPABASE_KEY`, `PUB_ORDER_TEST_EMAIL` and `PUB_ORDER_TEST_PASSWORD` as repository secrets. See [docs/testing.md](docs/testing.md) for a list of every test and what it checks.

For trying the API by hand, use the Swagger UI at `/docs` on the running backend.

## Team

This project is being developed as a group project at Vanderbilt University.

## Status

Currently in development.
