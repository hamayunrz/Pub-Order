// Integration tests: the real App, Login, Menu, cart logic, and browser storage
// working together. Only the outside services (Supabase and /api/me) are faked.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { CART_STORAGE_KEY } from './cart.js';
import { getSupabase } from './supabase.js';

vi.mock('./supabase.js', () => ({
  getSupabase: vi.fn(),
}));

const EMAIL = 'student@vanderbilt.edu';
let auth;

beforeEach(() => {
  window.location.hash = '';
  window.localStorage.clear();
  auth = { signInWithPassword: vi.fn(), signUp: vi.fn() };
  getSupabase.mockReturnValue({ auth });
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  window.location.hash = '';
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function signIn(user) {
  await user.type(screen.getByLabelText('Email'), EMAIL);
  await user.type(screen.getByLabelText('Password'), 'secret123');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('Sign in to menu', () => {
  it('signs in, opens the menu, and keeps the cart across pages', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'token-1' } }, error: null });
    fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'user-1', email: EMAIL }) });
    const user = userEvent.setup();
    render(<App />);

    await signIn(user);

    expect(await screen.findByText(`Signed in as ${EMAIL}`)).toBeInTheDocument();
    expect(window.location.hash).toBe('#menu');
    expect(fetch).toHaveBeenCalledWith('/api/me', { headers: { Authorization: 'Bearer token-1' } });

    await user.click(screen.getByRole('button', { name: 'Add Pub Burger to cart' }));
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).items).toEqual({ 'pub-burger': 1 });

    await user.click(screen.getByRole('button', { name: 'Back to login' }));
    await user.click(screen.getByRole('button', { name: 'Browse sample menu' }));

    expect(screen.getByLabelText('Pub Burger quantity')).toHaveTextContent('1');
  });

  it('stays on the login page when the backend rejects the session', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'token-1' } }, error: null });
    fetch.mockResolvedValue({ ok: false, json: async () => ({ detail: 'Sign in required.' }) });
    const user = userEvent.setup();
    render(<App />);

    await signIn(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in required.');
    expect(screen.queryByRole('heading', { name: 'What sounds good?' })).not.toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });
});
