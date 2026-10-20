import { useEffect, useId, useState } from 'react';
import { includedOptionIds, optionsFor } from './customizations.js';

export default function CustomizeDialog({ item, selected, inCart, onClose, onSave }) {
  const titleId = useId();
  const options = optionsFor(item);
  const [included, setIncluded] = useState(() => new Set(includedOptionIds(item, selected)));

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle(id) {
    setIncluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    onSave(options.filter((option) => !included.has(option.id)).map((option) => option.id));
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
        <p>Everything starts included. Uncheck anything you want left off, then {inCart ? 'save this cart item' : 'add it to your cart'}.</p>
        <fieldset>
          <legend className="visually-hidden">Options for {item.name}</legend>
          {options.map((option) => (
            <label key={option.id}>
              <input
                type="checkbox"
                checked={included.has(option.id)}
                onChange={() => toggle(option.id)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <div className="customize-actions">
          <button type="button" className="menu-text-button" onClick={onClose}>Cancel</button>
          <button type="button" className="menu-add" onClick={save}>
            {inCart ? 'Save customization' : 'Add with these options'}
          </button>
        </div>
      </section>
    </div>
  );
}
