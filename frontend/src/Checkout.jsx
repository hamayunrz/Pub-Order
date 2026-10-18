import { useEffect, useRef, useState } from 'react';
import { checkoutErrors, getCartSummary } from './cart.js';
import { reviewCart } from './menu-api.js';

export default function Checkout({ cart, catalog, onBack, onSignIn, onAcceptChanges }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [signInRequired, setSignInRequired] = useState(false);
  const activeRequest = useRef(0);
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const summary = getCartSummary(cart, catalog);
  const errors = checkoutErrors(cart, catalog);
  useEffect(() => () => { activeRequest.current += 1; }, []);
  useEffect(() => {
    activeRequest.current += 1;
    setResult(null); setError(''); setChecking(false); setSignInRequired(false);
  }, [cart, catalog]);

  async function validate() {
    if (checking || errors.length) return;
    const request = ++activeRequest.current;
    setChecking(true); setResult(null); setError(''); setSignInRequired(false);
    try {
      const review = await reviewCart(cart, catalog);
      if (request !== activeRequest.current) return;
      if (review.signInRequired) setSignInRequired(true);
      else setResult(review);
    } catch (failure) {
      if (request === activeRequest.current) setError(failure.message);
    } finally {
      if (request === activeRequest.current) setChecking(false);
    }
  }

  return <section className="checkout-review" aria-labelledby="checkout-title">
    <h2 id="checkout-title" ref={heading} tabIndex={-1}>Review your meal</h2>
    <p>Each meal swipe includes one entrée, one side, and one drink.</p>
    <ul className="menu-cart-items">
      {summary.items.map((item) => <li key={item.id}><strong>{item.name}</strong><span> × {item.quantity} · {item.swipeType}</span></li>)}
    </ul>
    <div className="menu-subtotal"><span>Total</span><strong>{cart.swipes} meal {cart.swipes === 1 ? 'swipe' : 'swipes'}</strong></div>
    <p>Entries: {summary.counts.Entry} · Sides: {summary.counts.Side} · Drinks: {summary.counts.Drink}</p>
    {errors.length > 0 && <ul role="alert">{errors.map((message) => <li key={message}>{message}</li>)}</ul>}
    {error && <p role="alert">{error}</p>}
    {signInRequired && <div role="alert"><p>Sign in to continue. Your cart will stay here.</p><button className="menu-add" onClick={onSignIn}>Sign in and keep cart</button></div>}
    {result?.issues.length > 0 && <div role="alert"><h3>Your meal needs review</h3><ul>{result.issues.map((issue, i) => <li key={i}>{issue.message}</li>)}</ul><button className="menu-add" onClick={() => onAcceptChanges(result)}>Review updated menu</button></div>}
    {result?.canSubmit && <p role="status">Your meal is valid: {result.swipes} meal {result.swipes === 1 ? 'swipe' : 'swipes'}. No order has been placed. Order submission is not available yet.</p>}
    <div className="checkout-actions">
      <button className="menu-text-button" onClick={onBack}>Back to cart</button>
      <button className="menu-add" disabled={checking || errors.length > 0} onClick={validate}>{checking ? 'Checking latest menu…' : 'Validate checkout'}</button>
    </div>
  </section>;
}
