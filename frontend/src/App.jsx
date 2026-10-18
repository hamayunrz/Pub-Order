import { useEffect, useState } from 'react';
import Login from './Login.jsx';
import Menu from './Menu.jsx';
import { getSupabase } from './supabase.js';
import './menu.css';

export default function App() {
  const [page, setPage] = useState(() => window.location.hash === '#menu' ? 'menu' : 'login');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const followHash = () => setPage(window.location.hash === '#menu' ? 'menu' : 'login');
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

  function navigate(nextPage) {
    window.location.hash = nextPage;
    setPage(nextPage);
  }

  return <>
    <div hidden={page !== 'menu'}><Menu email={email} onBack={() => navigate('login')} /></div>
    {page !== 'menu' && <Login onBrowse={() => navigate('menu')} onSignedIn={(signedInEmail) => {
      setEmail(signedInEmail);
      navigate('menu');
    }} />}
  </>;
}
