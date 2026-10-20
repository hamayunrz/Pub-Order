import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Kitchen from './Kitchen.jsx';
import { loadOrders, updateOrderStatus } from './order-api.js';

vi.mock('./order-api.js', () => ({
  loadOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

const ID = '0a1b2c3d-0000-4000-8000-000000000001';
const order = {
  id: ID, status: 'Received', swipes: 1, createdAt: '2026-10-20T16:00:00+00:00',
  items: [{ id: 'burger', name: 'Pub Burger', swipeType: 'Entry', quantity: 1 }],
};

beforeEach(() => {
  loadOrders.mockReset();
  updateOrderStatus.mockReset();
});

describe('Kitchen orders', () => {
  it('lists every order and saves a new status', async () => {
    loadOrders.mockResolvedValue({ orders: [order] });
    updateOrderStatus.mockResolvedValue({ order: { ...order, status: 'Preparing' } });
    const user = userEvent.setup();
    render(<Kitchen email="kitchen@puborder.test" onSignOut={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'Orders' })).toBeInTheDocument();
    expect(screen.getByText('Pub Burger × 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Received' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Preparing' }));

    expect(updateOrderStatus).toHaveBeenCalledWith(ID, 'Preparing');
    expect(await screen.findByRole('button', { name: 'Preparing' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('tells a student account it cannot change status', async () => {
    loadOrders.mockResolvedValue({ orders: [order] });
    updateOrderStatus.mockResolvedValue({ forbidden: true });
    const user = userEvent.setup();
    render(<Kitchen email="student@vanderbilt.edu" onSignOut={vi.fn()} />);

    await screen.findByText('Pub Burger × 1');
    await user.click(screen.getByRole('button', { name: 'Ready for pickup' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This account cannot change order status.');
  });
});
