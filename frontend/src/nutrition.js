// Estimated from published labels for the branded drinks and from typical restaurant
// portions for the cooked food. Swap in the kitchen's own numbers when you have them.
const FACTS = {
  'beyond-burger-patty': { serving: '1 patty', calories: 230, totalFat: 14, saturatedFat: 2, cholesterol: 0, sodium: 310, carbs: 8, fiber: 2, sugars: 0, protein: 21 },
  'chicken-sandwich': { serving: '1 sandwich', calories: 530, totalFat: 26, saturatedFat: 5, cholesterol: 60, sodium: 1240, carbs: 46, fiber: 2, sugars: 7, protein: 29 },
  'chicken-tenders': { serving: '3 tenders', calories: 430, totalFat: 22, saturatedFat: 4, cholesterol: 75, sodium: 980, carbs: 24, fiber: 1, sugars: 1, protein: 33 },
  'fried-cod-with-tartar-sauce': { serving: '4 oz.', calories: 460, totalFat: 28, saturatedFat: 5, cholesterol: 50, sodium: 780, carbs: 30, fiber: 1, sugars: 2, protein: 20 },
  'loaded-fries': { serving: '10 oz.', calories: 800, totalFat: 44, saturatedFat: 16, cholesterol: 40, sodium: 1540, carbs: 82, fiber: 6, sugars: 4, protein: 18 },
  'philly-cheesesteak': { serving: '1 sandwich', calories: 660, totalFat: 32, saturatedFat: 13, cholesterol: 85, sodium: 1480, carbs: 52, fiber: 3, sugars: 6, protein: 40 },
  'pub-burger': { serving: '1 burger', calories: 680, totalFat: 42, saturatedFat: 16, cholesterol: 100, sodium: 1180, carbs: 42, fiber: 2, sugars: 8, protein: 34 },
  'seasoned-wings': { serving: '5 wings', calories: 500, totalFat: 34, saturatedFat: 9, cholesterol: 145, sodium: 1180, carbs: 6, fiber: 0, sugars: 1, protein: 42 },
  'cauliflower-wings': { serving: '8 oz.', calories: 410, totalFat: 22, saturatedFat: 3, cholesterol: 0, sodium: 980, carbs: 44, fiber: 5, sugars: 6, protein: 8 },
  'pretzel-sticks': { serving: '2 pretzels', calories: 360, totalFat: 6, saturatedFat: 2, cholesterol: 0, sodium: 1040, carbs: 66, fiber: 2, sugars: 4, protein: 10 },
  'straight-cut-fries': { serving: '3 oz.', calories: 270, totalFat: 13, saturatedFat: 2, cholesterol: 0, sodium: 220, carbs: 34, fiber: 3, sugars: 0, protein: 3 },
  'apple-juice': { serving: '8 oz.', calories: 120, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 10, carbs: 29, fiber: 0, sugars: 26, protein: 0 },
  'cranberry-juice': { serving: '8 oz.', calories: 110, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 10, carbs: 28, fiber: 0, sugars: 25, protein: 0 },
  'lemon-lime-gatorade': { serving: '12 oz.', calories: 80, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 160, carbs: 22, fiber: 0, sugars: 21, protein: 0 },
  'orange-gatorade': { serving: '12 oz.', calories: 80, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 160, carbs: 22, fiber: 0, sugars: 21, protein: 0 },
  'orange-juice': { serving: '8 oz.', calories: 110, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 0, carbs: 26, fiber: 0, sugars: 22, protein: 2 },
  'sobe-yumberry-pomegranate': { serving: '12 oz.', calories: 170, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 50, carbs: 42, fiber: 0, sugars: 40, protein: 0 },
  'sweet-tea': { serving: '8 oz.', calories: 90, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 5, carbs: 23, fiber: 0, sugars: 23, protein: 0 },
  'tropicana-lemonade': { serving: '12 oz.', calories: 150, totalFat: 0, saturatedFat: 0, cholesterol: 0, sodium: 30, carbs: 39, fiber: 0, sugars: 37, protein: 0 },
  'chocolate-milkshake': { serving: '1 shake', calories: 660, totalFat: 16, saturatedFat: 12, cholesterol: 80, sodium: 450, carbs: 112, fiber: 1, sugars: 101, protein: 17 },
  'strawberry-milkshake': { serving: '1 shake', calories: 560, totalFat: 16, saturatedFat: 12, cholesterol: 80, sodium: 440, carbs: 88, fiber: 1, sugars: 82, protein: 16 },
  'vanilla-milkshake': { serving: '1 shake', calories: 560, totalFat: 16, saturatedFat: 12, cholesterol: 80, sodium: 440, carbs: 87, fiber: 0, sugars: 82, protein: 16 },
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
