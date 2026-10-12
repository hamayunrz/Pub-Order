import { useEffect, useState } from 'react';
import Login from './Login.jsx';
import Menu from './Menu.jsx';
import './menu.css';

export default function App() {
  const [page, setPage] = useState(() => window.location.hash === '#menu' ? 'menu' : 'login');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const followHash = () => setPage(window.location.hash === '#menu' ? 'menu' : 'login');
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, []);

  function navigate(nextPage) {
    window.location.hash = nextPage;
    setPage(nextPage);
  }

  if (page === 'menu') {
    return <Menu email={email} onBack={() => navigate('login')} />;
  }

  return <Login onBrowse={() => navigate('menu')} onSignedIn={(signedInEmail) => {
    setEmail(signedInEmail);
    navigate('menu');
  }} />;
}
