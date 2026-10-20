import { useEffect, useId, useState } from 'react';
import { optionsFor } from './customizations.js';

export default function CustomizeDialog({ item, selected, inCart, onClose, onSave }) {
  const titleId = useId();
  const options = optionsFor(item);
  const [chosen, setChosen] = useState(() => new Set(selected));

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle(id) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="customize-backdrop" onMouseDown={onClose}>
      <section
        className="customize-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>Customize {item.name}</h2>
        <p>Choose any options, then {inCart ? 'save them on this cart item' : 'add the item to your cart'}.</p>
        <fieldset>
          <legend className="visually-hidden">Options for {item.name}</legend>
          {options.map((option) => (
            <label key={option.id}>
              <input
                type="checkbox"
                checked={chosen.has(option.id)}
                onChange={() => toggle(option.id)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <div className="customize-actions">
          <button type="button" className="menu-text-button" onClick={onClose}>Cancel</button>
          <button type="button" className="menu-add" onClick={() => onSave([...chosen])}>
            {inCart ? 'Save customization' : 'Add with these options'}
          </button>
        </div>
      </section>
    </div>
  );
}
