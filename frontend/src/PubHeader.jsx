// The dark Pub header used on the order pages, matching the menu's header.
export default function PubHeader({ email, children }) {
  return (
    <header className="menu-header">
      <div className="menu-wordmark">The Pub<span>Vanderbilt · Student project</span></div>
      <div className="menu-header-actions">
        {email ? <span className="menu-account">Signed in as {email}</span> : null}
        {children}
      </div>
    </header>
  );
}
