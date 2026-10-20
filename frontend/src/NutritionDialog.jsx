import { useEffect, useId } from 'react';
import { NUTRITION_ROWS, nutritionFor } from './nutrition.js';

export default function NutritionDialog({ item, onClose }) {
  const titleId = useId();
  const facts = nutritionFor(item);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="nutrition-backdrop" onMouseDown={onClose}>
      <section
        className="nutrition-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="menu-eyebrow">{item.category}</p>
        <h2 id={titleId}>{item.name}</h2>
        <p className="nutrition-serving">Serving size {facts.serving}</p>
        <table className="nutrition-table">
          <caption className="visually-hidden">Nutrition facts for {item.name}</caption>
          <tbody>
            {NUTRITION_ROWS.map(([key, label, unit]) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                <td>{facts[key]}{unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="nutrition-note">These numbers are placeholders and can be replaced later.</p>
        <div className="nutrition-actions">
          <button type="button" className="menu-add" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}
