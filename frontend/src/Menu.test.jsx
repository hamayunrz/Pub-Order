import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CART_STORAGE_KEY, MAX_SWIPES, filterMenu } from './cart.js';
import Menu from './Menu.jsx';
import { MENU_ITEMS } from './menu-data.js';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setup(props = {}) {
  const user = userEvent.setup();
  render(<Menu email="" onBack={vi.fn()} {...props} />);
  return user;
}

function addButton(name) {
  return screen.getByRole('button', { name: `Add ${name} to cart` });
}

function savedCart() {
  return JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY));
}

function swipeCount() {
  return screen.getByLabelText('Meal swipes count');
}

describe('Browsing the menu', () => {
  it('shows every menu item', () => {
    setup();

    expect(screen.getAllByRole('article')).toHaveLength(MENU_ITEMS.length);
    expect(screen.getByText(`${MENU_ITEMS.length} items to choose from`)).toBeInTheDocument();
  });

  it('filters by category', async () => {
    const user = setup();
    const sides = MENU_ITEMS.filter((item) => item.category === 'Grill Side');

    await user.click(screen.getByRole('button', { name: 'Grill Side' }));

    expect(screen.getAllByRole('article')).toHaveLength(sides.length);
    expect(screen.getByText(`${sides.length} items in grill side`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Grill Side' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('searches without caring about case', async () => {
    const user = setup();

    await user.type(screen.getByLabelText('Find something delicious'), 'FRIES');

    const names = screen.getAllByRole('article').map((article) => within(article).getByRole('heading').textContent);
    expect(names).toEqual(filterMenu('fries', 'All').map((item) => item.name));
  });

  it('shows a reset option when nothing matches', async () => {
    const user = setup();

    await user.click(screen.getByRole('button', { name: 'Beverages' }));
    await user.type(screen.getByLabelText('Find something delicious'), 'burger');

    expect(screen.getByText('No matches this time.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(screen.getAllByRole('article')).toHaveLength(MENU_ITEMS.length);
    expect(screen.getByLabelText('Find something delicious')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to a placeholder when an image fails to load', () => {
    const { container } = render(<Menu email="" onBack={vi.fn()} />);
    const image = container.querySelector('img');

    fireEvent.error(image);

    expect(image.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
  });
});

describe('Adding to the cart', () => {
  it('adds an item and updates the cart, header count, and notice', async () => {
    const user = setup();

    await user.click(addButton('Pub Burger'));

    expect(screen.getByRole('heading', { name: 'Your cart (1)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cart 1' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Pub Burger added to your cart.');
    expect(screen.getByLabelText('Pub Burger quantity')).toHaveTextContent('1');
  });

  it('shows how many of an item are in the cart while more can be added', async () => {
    const user = setup();

    await user.click(screen.getByRole('button', { name: 'Increase meal swipes' }));
    await user.click(addButton('Pub Burger'));

    expect(addButton('Pub Burger')).toHaveTextContent('1 in cart');
  });

  it('blocks more items of a full type but not other types', async () => {
    const user = setup();

    await user.click(addButton('Pub Burger'));

    expect(addButton('Chicken Tenders')).toBeDisabled();
    expect(addButton('Chicken Tenders')).toHaveTextContent('Entry limit reached');
    expect(addButton('Straight Cut Fries')).toBeEnabled();
    expect(addButton('Sweet Tea')).toBeEnabled();
  });

  it('shows progress for each part of a meal swipe', async () => {
    const user = setup();

    await user.click(addButton('Pub Burger'));
    await user.click(addButton('Straight Cut Fries'));
    await user.click(addButton('Sweet Tea'));

    expect(screen.getByText('Entries').querySelector('strong')).toHaveTextContent('1/1');
    expect(screen.getByText('Sides').querySelector('strong')).toHaveTextContent('1/1');
    expect(screen.getByText('Drinks').querySelector('strong')).toHaveTextContent('1/1');
  });
});

describe('Meal swipes', () => {
  it('cannot go below one swipe', () => {
    setup();

    expect(swipeCount()).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: 'Decrease meal swipes' })).toBeDisabled();
  });

  it('raising swipes allows another item of the same type', async () => {
    const user = setup();

    await user.click(addButton('Pub Burger'));
    await user.click(screen.getByRole('button', { name: 'Increase meal swipes' }));

    expect(swipeCount()).toHaveTextContent('2');
    expect(addButton('Chicken Tenders')).toBeEnabled();
  });

  it('cannot drop below the number of items of the busiest type', async () => {
    const user = setup();

    await user.click(screen.getByRole('button', { name: 'Increase meal swipes' }));
    await user.click(addButton('Pub Burger'));
    await user.click(addButton('Chicken Tenders'));

    expect(screen.getByRole('button', { name: 'Decrease meal swipes' })).toBeDisabled();
  });

  it(`stops at ${MAX_SWIPES} swipes`, async () => {
    const user = setup();
    const increase = screen.getByRole('button', { name: 'Increase meal swipes' });

    for (let swipes = 1; swipes < MAX_SWIPES; swipes += 1) {
      await user.click(increase);
    }

    expect(swipeCount()).toHaveTextContent(String(MAX_SWIPES));
    expect(increase).toBeDisabled();
  });
});

describe('Changing the cart', () => {
  it('changes quantity within the swipe allowance', async () => {
    const user = setup();

    await user.click(screen.getByRole('button', { name: 'Increase meal swipes' }));
    await user.click(addButton('Pub Burger'));
    await user.click(screen.getByRole('button', { name: 'Increase Pub Burger quantity' }));

    expect(screen.getByLabelText('Pub Burger quantity')).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: 'Increase Pub Burger quantity' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Decrease Pub Burger quantity' }));

    expect(screen.getByLabelText('Pub Burger quantity')).toHaveTextContent('1');
  });

  it('decreasing to zero empties the cart', async () => {
    const user = setup();

    await user.click(addButton('Pub Burger'));
    await user.click(screen.getByRole('button', { name: 'Decrease Pub Burger quantity' }));

    expect(screen.getByRole('heading', { name: 'A little hungry?' })).toBeInTheDocument();
  });

  it('removes a single item', async () => {
    const user = setup();

    await user.click(addButton('Pub Burger'));
    await user.click(addButton('Sweet Tea'));
    await user.click(screen.getByRole('button', { name: 'Remove Pub Burger from cart' }));

    expect(screen.queryByLabelText('Pub Burger quantity')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Sweet Tea quantity')).toHaveTextContent('1');
    expect(screen.getByRole('status')).toHaveTextContent('Pub Burger removed from your cart.');
  });

  it('clears the whole cart', async () => {
    const user = setup();

    await user.click(addButton('Pub Burger'));
    await user.click(addButton('Sweet Tea'));
    await user.click(screen.getByRole('button', { name: 'Clear cart' }));

    expect(screen.getByRole('heading', { name: 'A little hungry?' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cart cleared.');
    expect(screen.queryByRole('button', { name: 'Clear cart' })).not.toBeInTheDocument();
  });
});

describe('Saving the cart', () => {
  it('saves changes to browser storage', async () => {
    const user = setup();

    await user.click(addButton('Pub Burger'));

    expect(savedCart()).toEqual({ swipes: 1, items: { 'pub-burger': 1 } });
    expect(screen.getByText(/Cart saved on this browser/)).toBeInTheDocument();
  });

  it('restores a saved cart', () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ swipes: 2, items: { 'pub-burger': 2 } }));

    setup();

    expect(swipeCount()).toHaveTextContent('2');
    expect(screen.getByLabelText('Pub Burger quantity')).toHaveTextContent('2');
  });

  it('starts empty when the saved cart is corrupt', () => {
    window.localStorage.setItem(CART_STORAGE_KEY, '{broken');

    setup();

    expect(screen.getByRole('heading', { name: 'A little hungry?' })).toBeInTheDocument();
    expect(swipeCount()).toHaveTextContent('1');
  });

  it('explains when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    setup();

    expect(screen.getByText(/Browser storage is unavailable/)).toBeInTheDocument();
  });
});

describe('Header and navigation', () => {
  it('shows the signed-in email and a way back to login', async () => {
    const onBack = vi.fn();
    const user = setup({ email: 'student@vanderbilt.edu', onBack });

    expect(screen.getByText('Signed in as student@vanderbilt.edu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to login' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('offers sign in when browsing without an account', () => {
    setup();

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText(/Signed in as/)).not.toBeInTheDocument();
  });

  it('the cart link moves focus to the cart', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const user = setup();

    await user.click(screen.getByRole('link', { name: 'Cart 0' }));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Your cart (0)' })).toHaveFocus();
  });

  it('the skip link moves focus to the menu', async () => {
    const user = setup();

    await user.click(screen.getByRole('link', { name: 'Skip to menu' }));

    expect(screen.getByRole('main')).toHaveFocus();
  });
});
