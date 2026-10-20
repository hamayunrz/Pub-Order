const GROUPS = {
  'Grill Main': [
    { id: 'no-onion', label: 'No onion' },
    { id: 'no-tomato', label: 'No tomato' },
    { id: 'extra-pickles', label: 'Extra pickles' },
    { id: 'add-cheese', label: 'Add cheese' },
  ],
  'Grill Side': [
    { id: 'no-salt', label: 'No salt' },
    { id: 'side-sauce', label: 'Side of sauce' },
  ],
  Beverages: [
    { id: 'no-ice', label: 'No ice' },
    { id: 'light-ice', label: 'Light ice' },
  ],
  Milkshakes: [
    { id: 'no-whip', label: 'No whipped cream' },
    { id: 'extra-whip', label: 'Extra whipped cream' },
  ],
};

const LABELS = new Map(Object.values(GROUPS).flat().map((option) => [option.id, option.label]));

export function optionsFor(item) {
  return GROUPS[item?.category] || [];
}

export function allowedOptionIds(item) {
  return new Set(optionsFor(item).map((option) => option.id));
}

export function isOptionId(id) {
  return LABELS.has(id);
}

export function customizationText(optionIds) {
  return (optionIds || []).map((id) => LABELS.get(id)).filter(Boolean).join(', ');
}
