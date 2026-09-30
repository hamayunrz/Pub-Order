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

Frontend (Node.js 22.12+):

```sh
cd frontend
npm install
npm run dev
```

Backend (Python 3.10+), in a separate terminal:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The frontend starts blank. FastAPI's default API docs are at http://127.0.0.1:8000/docs.

## Running tests

Tests replace Supabase with a fake, so they don't need a `.env` file or a network connection.

Backend (pytest), from `backend/` with the virtual environment active:

```sh
pip install -r requirements-dev.txt
pytest
```

Frontend (Vitest and React Testing Library), from `frontend/`:

```sh
npm test            # run once
npm run test:watch  # rerun on file changes
```

GitHub Actions runs both suites on every pull request and push to `main`.

For trying the API by hand, use the Swagger UI at `/docs` on the running backend.

## Team

This project is being developed as a group project at Vanderbilt University.

## Status

Currently in development.
