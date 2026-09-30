import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login.jsx';
import { getSupabase } from './supabase.js';

vi.mock('./supabase.js', () => ({
  getSupabase: vi.fn(),
}));

let auth;

beforeEach(() => {
  auth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
  };
  getSupabase.mockReturnValue({ auth });
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function setup() {
  const user = userEvent.setup();
  render(<Login />);
  return user;
}

async function fillSignIn(user, email = 'student@vanderbilt.edu', password = 'secret123') {
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
}

function submitButton(name = 'Sign in') {
  return screen.getByRole('button', { name });
}

describe('Login form validation', () => {
  it('requires email and password', async () => {
    const user = setup();

    await user.click(submitButton());

    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('rejects a badly formed email', async () => {
    const user = setup();

    await fillSignIn(user, 'not-an-email');
    await user.click(submitButton());

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('requires the confirmation password on sign up', async () => {
    const user = setup();

    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    await fillSignIn(user);
    await user.click(submitButton('Create account'));

    expect(screen.getByText('Confirm your password.')).toBeInTheDocument();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords on sign up', async () => {
    const user = setup();

    await user.click(screen.getByRole('tab', { name: 'Sign up' }));
    await fillSignIn(user);
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(submitButton('Create account'));

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});

describe('Login form controls', () => {
  it('shows and hides the password', async () => {
    const user = setup();
    const password = screen.getByLabelText('Password');

    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Hide' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('switches tabs and clears errors', async () => {
    const user = setup();

    await user.click(submitButton());
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Sign up' }));

    expect(screen.queryByText('Enter your email.')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sign up' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    expect(submitButton('Create account')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Sign in' }));

    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();
  });

  it('explains when Supabase is not configured', async () => {
    getSupabase.mockReturnValue(null);
    const user = setup();

    await fillSignIn(user);
    await user.click(submitButton());

    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in is not configured yet.');
    expect(fetch).not.toHaveBeenCalled();
  });
});
