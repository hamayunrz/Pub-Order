// Placeholder nutrition facts for the current menu. Edit the numbers here when the real
// values are available. Every id in menu-data.js should have an entry.
const FACTS = {
  'beyond-burger-patty': { serving: '1 patty', calories: 230, totalFat: 14, saturatedFat: 5, cholesterol: 0, sodium: 390, carbs: 7, fiber: 2, sugars: 0, protein: 20 },
  'chicken-sandwich': { serving: '1 sandwich', calories: 480, totalFat: 19, saturatedFat: 4, cholesterol: 65, sodium: 1040, carbs: 46, fiber: 2, sugars: 6, protein: 29 },
  'chicken-tenders': { serving: '3 tenders', calories: 390, totalFat: 18, saturatedFat: 3, cholesterol: 55, sodium: 890, carbs: 22, fiber: 1, sugars: 1, protein: 32 },
  'fried-cod-with-tartar-sauce': { serving: '4 oz.', calories: 420, totalFat: 22, saturatedFat: 4, cholesterol: 45, sodium: 760, carbs: 31, fiber: 1, sugars: 2, protein: 22 },
  'loaded-fries': { serving: '10 oz.', calories: 640, totalFat: 32, saturatedFat: 12, cholesterol: 35, sodium: 1180, carbs: 68, fiber: 6, sugars: 4, protein: 16 },
  'philly-cheesesteak': { serving: '1 sandwich', calories: 560, totalFat: 24, saturatedFat: 10, cholesterol: 75, sodium: 1260, carbs: 48, fiber: 2, sugars: 5, protein: 34 },
  'pub-burger': { serving: '1 burger', calories: 540, totalFat: 29, saturatedFat: 11, cholesterol: 80, sodium: 980, carbs: 38, fiber: 2, sugars: 6, protein: 28 },
  'seasoned-wings': { serving: '5 wings', calories: 450, totalFat: 28, saturatedFat: 7, cholesterol: 95, sodium: 1320, carbs: 8, fiber: 0, sugars: 1, protein: 36 },
  'cauliflower-wings': { serving: '8 oz.', calories: 310, totalFat: 16, saturatedFat: 2, cholesterol: 0, sodium: 840, carbs: 32, fiber: 4, sugars: 5, protein: 8 },
  'pretzel-sticks': { serving: '2 pretzels', calories: 280, totalFat: 4, saturatedFat: 1, cholesterol: 0, sodium: 720, carbs: 52, fiber: 2, sugars: 3, protein: 8 },
  'straight-cut-fries': { serving: '3 oz.', calories: 230, totalFat: 11, saturatedFat: 2, cholesterol: 0, sodium: 180, carbs: 30, fiber: 3, sugars: 0, protein: 3 },
  'apple-juice': { serving: '8 oz.', calories: 110, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 10, carbs: 27, fiber: 0, sugars: 24, protein: 0 },
  'cranberry-juice': { serving: '8 oz.', calories: 130, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 15, carbs: 33, fiber: 0, sugars: 31, protein: 0 },
  'lemon-lime-gatorade': { serving: '12 oz.', calories: 80, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 160, carbs: 21, fiber: 0, sugars: 21, protein: 0 },
  'orange-gatorade': { serving: '12 oz.', calories: 80, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 160, carbs: 22, fiber: 0, sugars: 21, protein: 0 },
  'orange-juice': { serving: '8 oz.', calories: 110, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 5, carbs: 26, fiber: 0, sugars: 22, protein: 2 },
  'sobe-yumberry-pomegranate': { serving: '12 oz.', calories: 150, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 40, carbs: 37, fiber: 0, sugars: 35, protein: 0 },
  'sweet-tea': { serving: '8 oz.', calories: 90, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 10, carbs: 23, fiber: 0, sugars: 22, protein: 0 },
  'tropicana-lemonade': { serving: '12 oz.', calories: 160, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 20, carbs: 40, fiber: 0, sugars: 38, protein: 0 },
  'chocolate-milkshake': { serving: '1 shake', calories: 580, totalFat: 18, saturatedFat: 11, cholesterol: 55, sodium: 280, carbs: 86, fiber: 2, sugars: 74, protein: 13 },
  'strawberry-milkshake': { serving: '1 shake', calories: 540, totalFat: 16, saturatedFat: 10, cholesterol: 50, sodium: 240, carbs: 84, fiber: 1, sugars: 72, protein: 12 },
  'vanilla-milkshake': { serving: '1 shake', calories: 520, totalFat: 16, saturatedFat: 10, cholesterol: 50, sodium: 230, carbs: 78, fiber: 0, sugars: 68, protein: 12 },
};

const BY_TYPE = {
  Entry: { serving: '1 serving', calories: 500, totalFat: 22, saturatedFat: 8, cholesterol: 60, sodium: 900, carbs: 40, fiber: 2, sugars: 6, protein: 25 },
  Side: { serving: '1 serving', calories: 250, totalFat: 10, saturatedFat: 2, cholesterol: 0, sodium: 400, carbs: 34, fiber: 3, sugars: 2, protein: 5 },
  Drink: { serving: '1 serving', calories: 120, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 20, carbs: 29, fiber: 0, sugars: 26, protein: 0 },
};

export const NUTRITION_ROWS = [
  ['calories', 'Calories', ''],
  ['totalFat', 'Total fat', 'g'],
  ['saturatedFat', 'Saturated fat', 'g'],
  ['cholesterol', 'Cholesterol', 'mg'],
  ['sodium', 'Sodium', 'mg'],
  ['carbs', 'Total carbohydrate', 'g'],
  ['fiber', 'Dietary fiber', 'g'],
  ['sugars', 'Total sugars', 'g'],
  ['protein', 'Protein', 'g'],
];

export function nutritionFor(item) {
  return FACTS[item?.id] || { ...(BY_TYPE[item?.swipeType] || BY_TYPE.Entry), serving: item?.portion || '1 serving' };
}

export function hasListedNutrition(id) {
  return Object.prototype.hasOwnProperty.call(FACTS, id);
}
