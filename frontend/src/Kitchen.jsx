// Kitchen staff see every order and move it between Received, Preparing, Ready, and Collected.
import { useEffect, useRef, useState } from 'react';
import PubHeader from './PubHeader.jsx';
import { loadOrders, updateOrderStatus } from './order-api.js';
import { ORDER_STATUSES, formatPlacedAt, isOpenOrder, shortOrderId, stepLabel, swipeLabel } from './order-status.js';

export default function Kitchen({ email, onSignOut }) {
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [savingId, setSavingId] = useState('');
  const [rowError, setRowError] = useState('');
  const heading = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading'); setError('');
    loadOrders(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.signInRequired) { setState('signIn'); return; }
      setOrders(result.orders); setState('ready');
    }).catch((failure) => {
      if (controller.signal.aborted) return;
      setError(failure.message); setState('error');
    });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => { if (state !== 'loading') heading.current?.focus(); }, [state]);

  async function changeStatus(order, status) {
    if (order.status === status || savingId) return;
    setSavingId(order.id); setRowError('');
    try {
      const result = await updateOrderStatus(order.id, status);
      if (result.signInRequired) { setState('signIn'); return; }
      if (result.forbidden) { setRowError('This account cannot change order status.'); return; }
      if (result.notFound) { setRowError('That order is no longer available.'); return; }
      setOrders((current) => current.map((item) => (item.id === result.order.id ? result.order : item)));
    } catch (failure) {
      setRowError(failure.message);
    } finally {
      setSavingId('');
    }
  }

  const open = orders.filter(isOpenOrder);
  const collected = orders.filter((order) => !isOpenOrder(order));

  return (
    <div className="menu-page order-page">
      <PubHeader email={email}>
        <button className="menu-text-button" onClick={onSignOut}>Sign out</button>
      </PubHeader>
      <main className="menu-content order-content">
        <section className="order-hero">
          <p className="menu-eyebrow">Kitchen</p>
          <h1 ref={heading} tabIndex={-1}>Orders</h1>
          <p>Every order is listed here. Choose a status to update it.</p>
        </section>

        {state === 'loading' && <p role="status">Loading orders…</p>}
        {state === 'signIn' && <div className="order-message"><p>Sign in with the kitchen account to update orders.</p></div>}
        {state === 'error' && <div className="order-message" role="alert">
          <p>{error}</p>
          <button className="menu-add" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
        </div>}
        {state === 'ready' && orders.length === 0 && <div className="order-message"><p>No orders yet.</p></div>}
        {state === 'ready' && open.length > 0 && <OrderGroup title="Open" orders={open} savingId={savingId} onChangeStatus={changeStatus} />}
        {state === 'ready' && collected.length > 0 && <OrderGroup title="Collected" orders={collected} savingId={savingId} onChangeStatus={changeStatus} />}
        {rowError && <p className="order-refresh-error" role="alert">{rowError}</p>}
      </main>
    </div>
  );
}

function OrderGroup({ title, orders, savingId, onChangeStatus }) {
  const id = `kitchen-${title.toLowerCase()}`;
  return (
    <section className="order-group" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <ul className="order-list">
        {orders.map((order) => <li key={order.id} className={`order-row order-row-${order.status.toLowerCase()}`}>
          <div className="order-row-main">
            <strong>Order #{shortOrderId(order.id)}</strong>
            <span>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</span>
            <span className="order-row-meta">{swipeLabel(order.swipes)}{order.createdAt ? ` · ${formatPlacedAt(order.createdAt)}` : ''}</span>
            <div className="kitchen-status" role="group" aria-label={`Status for order ${shortOrderId(order.id)}`}>
              {ORDER_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="menu-add"
                  aria-pressed={order.status === status}
                  disabled={Boolean(savingId)}
                  onClick={() => onChangeStatus(order, status)}
                >
                  {stepLabel(status)}
                </button>
              ))}
            </div>
          </div>
          <span className="order-chip">{stepLabel(order.status)}</span>
        </li>)}
      </ul>
    </section>
  );
}
