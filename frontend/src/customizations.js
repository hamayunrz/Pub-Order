const GROUPS = {
  'Grill Main': [
    { id: 'no-onion', label: 'Onion', removed: 'No onion' },
    { id: 'no-tomato', label: 'Tomato', removed: 'No tomato' },
    { id: 'no-pickles', label: 'Pickles', removed: 'No pickles' },
    { id: 'no-cheese', label: 'Cheese', removed: 'No cheese' },
  ],
};

const OPTIONS = new Map(Object.values(GROUPS).flat().map((option) => [option.id, option]));

export function optionsFor(item) {
  return GROUPS[item?.category] || [];
}

export function allowedOptionIds(item) {
  return new Set(optionsFor(item).map((option) => option.id));
}

export function isOptionId(id) {
  return OPTIONS.has(id);
}

export function includedOptionIds(item, removedIds) {
  const removed = new Set(removedIds || []);
  return optionsFor(item).filter((option) => !removed.has(option.id)).map((option) => option.id);
}

export function customizationText(optionIds) {
  return (optionIds || []).map((id) => OPTIONS.get(id)?.removed).filter(Boolean).join(', ');
}
