import { useEffect, useState } from 'react';
import Login from './Login.jsx';
import Menu from './Menu.jsx';
import MyOrders from './MyOrders.jsx';
import OrderPage from './OrderPage.jsx';
import { getSupabase } from './supabase.js';
import './menu.css';
import './orders.css';

// Pages live in the URL hash so a refresh or a shared link reopens the same page:
// #menu, #orders, #order/<order id>; anything else is the login page.
export function pageFromHash(hash) {
  const value = hash.replace(/^#/, '');
  if (value === 'menu') return { name: 'menu' };
  if (value === 'orders') return { name: 'orders' };
  const order = /^order\/([^/?#]+)$/.exec(value);
  if (order) return { name: 'order', orderId: decodeURIComponent(order[1]) };
  return { name: 'login' };
}

const hashFor = (page) => (page.name === 'order' ? `order/${encodeURIComponent(page.orderId)}` : page.name);

export default function App() {
  const [page, setPage] = useState(() => pageFromHash(window.location.hash));
  const [email, setEmail] = useState('');
  // The order Checkout just saved, shown at once while the page re-reads it from the server.
  const [placedOrder, setPlacedOrder] = useState(null);
  // Where to go after signing in, when an order page asked the student to sign in first.
  const [afterSignIn, setAfterSignIn] = useState(null);

  useEffect(() => {
    const followHash = () => setPage(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, []);

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) setEmail(data?.session?.user?.email || '');
    }).catch(() => {});
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setEmail(session?.user?.email || '');
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  function navigate(next) {
    const target = typeof next === 'string' ? { name: next } : next;
    window.location.hash = hashFor(target);
    setPage(target);
    window.scrollTo?.(0, 0);
  }

  function signInThenReturn() {
    setAfterSignIn(page);
    navigate('login');
  }

  const openOrder = (orderId) => {
    setPlacedOrder(null);
    navigate({ name: 'order', orderId });
  };

  return <>
    {/* The menu stays mounted so the cart and search survive visits to other pages. */}
    <div hidden={page.name !== 'menu'}><Menu
      email={email}
      onBack={() => navigate('login')}
      onViewOrders={() => navigate('orders')}
      onOrderPlaced={(order) => { setPlacedOrder(order); navigate({ name: 'order', orderId: order.id }); }}
    /></div>
    {page.name === 'order' && <OrderPage
      key={page.orderId}
      orderId={page.orderId}
      initialOrder={placedOrder}
      justPlaced={placedOrder?.id === page.orderId}
      email={email}
      onBackToMenu={() => navigate('menu')}
      onViewOrders={() => navigate('orders')}
      onSignIn={signInThenReturn}
    />}
    {page.name === 'orders' && <MyOrders
      email={email}
      onOpenOrder={openOrder}
      onBackToMenu={() => navigate('menu')}
      onSignIn={signInThenReturn}
    />}
    {page.name === 'login' && <Login onBrowse={() => navigate('menu')} onSignedIn={(signedInEmail) => {
      setEmail(signedInEmail);
      navigate(afterSignIn ?? 'menu');
      setAfterSignIn(null);
    }} />}
  </>;
}
