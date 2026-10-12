import { useEffect, useState } from 'react';
import { CATEGORIES, MENU_IMAGE_BASE } from './menu-data.js';
import { CART_STORAGE_KEY, MAX_SWIPES, filterMenu, getCartSummary, restoreCart, setQuantity, setSwipes } from './cart.js';

const IMAGE_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f2ecdf'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='18' fill='%23a89f8c' text-anchor='middle' dominant-baseline='middle'%3ENo image%3C/text%3E%3C/svg%3E";

function initialCart() {
  try { return restoreCart(window.localStorage.getItem(CART_STORAGE_KEY)); }
  catch { return { swipes: 1, items: {} }; }
}

export default function Menu({ email, onBack }) {
  const [cart, setCart] = useState(initialCart);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [notice, setNotice] = useState('');
  const [canSave, setCanSave] = useState(true);
  const summary = getCartSummary(cart);
  const visibleItems = filterMenu(query, category);
  const minSwipesNeeded = Math.max(summary.counts.Entry, summary.counts.Side, summary.counts.Drink, 1);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      setCanSave(true);
    } catch { setCanSave(false); }
  }, [cart]);

  function addItem(item) {
    setCart((current) => setQuantity(current, item.id, (current.items[item.id] || 0) + 1));
    setNotice(`${item.name} added to your cart.`);
  }

  function changeQuantity(item, change) {
    setCart((current) => setQuantity(current, item.id, (current.items[item.id] || 0) + change));
  }

  function removeItem(item) {
    setCart((current) => setQuantity(current, item.id, 0));
    setNotice(`${item.name} removed from your cart.`);
  }

  function changeSwipes(change) {
    setCart((current) => setSwipes(current, current.swipes + change));
  }

  return (
    <div className="menu-page">
      <a className="menu-skip" href="#menu-content" onClick={(event) => {
        event.preventDefault();
        document.getElementById('menu-content').focus();
      }}>Skip to menu</a>
      <header className="menu-header">
        <div className="menu-wordmark">The Pub<span>Vanderbilt · Student project</span></div>
        <div className="menu-header-actions">
          {email ? <span className="menu-account">Signed in as {email}</span> : null}
          <button className="menu-text-button" onClick={onBack}>{email ? 'Back to login' : 'Sign in'}</button>
          <a className="menu-cart-link" href="#cart" onClick={(event) => {
            event.preventDefault();
            document.getElementById('cart').scrollIntoView({ behavior: 'smooth' });
            document.getElementById('cart-title').focus({ preventScroll: true });
          }}>Cart <span>{summary.count}</span></a>
        </div>
      </header>

      <main id="menu-content" className="menu-content" tabIndex={-1}>
        <section className="menu-hero" aria-labelledby="menu-heading">
          <div>
            <p className="menu-eyebrow">Good food. Your pick.</p>
            <h1 id="menu-heading">What sounds good?</h1>
            <p>Find a favorite, add a side, and make it yours.</p>
          </div>
          <div className="menu-demo-note"><strong>Sample menu</strong><span>Demo items for meal swipe orders. No orders are sent to the kitchen.</span></div>
        </section>

        <div className="menu-layout">
          <section className="menu-catalog" aria-label="Food and drinks">
            <label className="menu-search-label" htmlFor="menu-search">Find something delicious</label>
            <input id="menu-search" className="menu-search" type="search" placeholder="Search burgers, fries, drinks…" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="menu-categories" role="group" aria-label="Menu categories">
              {CATEGORIES.map((name) => <button key={name} className="menu-category" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
            </div>
            <p className="menu-results" aria-live="polite">{visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}{category !== 'All' ? ` in ${category.toLowerCase()}` : ' to choose from'}</p>
            <div className="menu-grid">
              {visibleItems.map((item) => {
                const itemQuantity = cart.items[item.id] || 0;
                const typeFull = summary.counts[item.swipeType] >= summary.swipes;
                return (
                  <article className="menu-item" key={item.id} aria-labelledby={`name-${item.id}`}>
                    <div className="menu-item-image">
                      <img
                        src={item.image ? `${MENU_IMAGE_BASE}${item.image}` : IMAGE_FALLBACK}
                        alt=""
                        loading="lazy"
                        onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = IMAGE_FALLBACK; }}
                      />
                    </div>
                    <div className="menu-item-top"><span className="menu-item-category">{item.category}</span>{item.label ? <span className="menu-item-label">{item.label}</span> : null}</div>
                    <h2 id={`name-${item.id}`}>{item.name}</h2>
                    {item.portion ? <p className="menu-item-portion">{item.portion}</p> : null}
                    {item.description ? <p>{item.description}</p> : null}
                    <div className="menu-item-bottom">
                      <span className="menu-item-swipe-type">{item.swipeType}</span>
                      <button className="menu-add" aria-label={`Add ${item.name} to cart`} disabled={typeFull} onClick={() => addItem(item)}>
                        {typeFull ? `${item.swipeType} limit reached` : '+ Add'}
                        {itemQuantity > 0 && !typeFull ? <span> · {itemQuantity} in cart</span> : null}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {visibleItems.length === 0 ? <div className="menu-no-results"><h2>No matches this time.</h2><p>Try another search or explore all categories.</p><button className="menu-text-button" onClick={() => { setQuery(''); setCategory('All'); }}>Reset filters</button></div> : null}
          </section>

          <aside id="cart" className="menu-cart" aria-labelledby="cart-title">
            <div className="menu-cart-heading"><h2 id="cart-title" tabIndex={-1}>Your cart <span>({summary.count})</span></h2>{summary.count > 0 ? <button className="menu-text-button" onClick={() => { setCart((current) => ({ ...current, items: {} })); setNotice('Cart cleared.'); }}>Clear cart</button> : null}</div>
            <div className="menu-swipe-control">
              <span className="menu-swipe-control-label">Meal swipes</span>
              <div className="menu-quantity" role="group" aria-label="Number of meal swipes">
                <button aria-label="Decrease meal swipes" disabled={summary.swipes <= minSwipesNeeded} onClick={() => changeSwipes(-1)}>−</button>
                <span aria-label="Meal swipes count">{summary.swipes}</span>
                <button aria-label="Increase meal swipes" disabled={summary.swipes >= MAX_SWIPES} onClick={() => changeSwipes(1)}>+</button>
              </div>
            </div>
            {summary.count === 0 ? <div className="menu-cart-empty"><span aria-hidden="true">＋</span><h3>A little hungry?</h3><p>Add something from the menu to start your cart.</p></div> : (
              <>
                <ul className="menu-cart-items">
                  {summary.items.map((item) => <li key={item.id}>
                    <div className="menu-cart-item-title"><h3>{item.name}</h3><span className="menu-item-swipe-type">{item.swipeType}</span></div>
                    <p className="menu-cart-item-portion">{item.portion}</p>
                    <div className="menu-cart-controls">
                      <div className="menu-quantity" role="group" aria-label={`Quantity for ${item.name}`}>
                        <button aria-label={`Decrease ${item.name} quantity`} onClick={() => changeQuantity(item, -1)}>−</button>
                        <span aria-label={`${item.name} quantity`}>{item.quantity}</span>
                        <button aria-label={`Increase ${item.name} quantity`} disabled={summary.counts[item.swipeType] >= summary.swipes} onClick={() => changeQuantity(item, 1)}>+</button>
                      </div>
                      <button className="menu-text-button" aria-label={`Remove ${item.name} from cart`} onClick={() => removeItem(item)}>Remove</button>
                    </div>
                  </li>)}
                </ul>
                <div className="menu-swipe-progress">
                  <span>Entries <strong>{summary.counts.Entry}/{summary.swipes}</strong></span>
                  <span>Sides <strong>{summary.counts.Side}/{summary.swipes}</strong></span>
                  <span>Drinks <strong>{summary.counts.Drink}/{summary.swipes}</strong></span>
                </div>
                <p className="menu-cart-footnote">Each meal swipe covers one entry, one side, and one drink. Checkout is not available in this demo.</p>
              </>
            )}
            <p className="menu-save-note">{canSave ? `Cart saved on this browser. Up to ${MAX_SWIPES} meal swipes per order.` : 'Browser storage is unavailable. Your cart will last until you leave this page.'}</p>
          </aside>
        </div>
        <p className="menu-notice" role="status">{notice}</p>
      </main>
    </div>
  );
}
