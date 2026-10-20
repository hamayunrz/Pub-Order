import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { SWIPE_TYPES } from './cart.js';
import { CATEGORIES, MENU_ITEMS } from './menu-data.js';

const imageDir = path.resolve(import.meta.dirname, '../public/images/menu') + path.sep;

describe('menu data', () => {
  test('every item has a unique id', () => {
    const ids = MENU_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every item has a name, category, portion, and known swipe type', () => {
    for (const item of MENU_ITEMS) {
      expect(item.name, item.id).toBeTruthy();
      expect(item.category, item.id).toBeTruthy();
      expect(item.portion, item.id).toBeTruthy();
      expect(SWIPE_TYPES, item.id).toContain(item.swipeType);
    }
  });

  test('every swipe type has at least one item, so a full meal swipe is possible', () => {
    for (const type of SWIPE_TYPES) {
      expect(MENU_ITEMS.some((item) => item.swipeType === type), type).toBe(true);
    }
  });

  test('categories start with All, have no duplicates, and each has items', () => {
    expect(CATEGORIES[0]).toBe('All');
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
    for (const category of CATEGORIES.slice(1)) {
      expect(MENU_ITEMS.some((item) => item.category === category), category).toBe(true);
    }
  });
});

describe('menu images', () => {
  test('every image file exists', () => {
    for (const item of MENU_ITEMS.filter((menuItem) => menuItem.image)) {
      expect(existsSync(imageDir + item.image), item.image).toBe(true);
    }
  });

  test('every image is credited in CREDITS.md', () => {
    const credits = readFileSync(imageDir + 'CREDITS.md', 'utf8');
    for (const item of MENU_ITEMS.filter((menuItem) => menuItem.image)) {
      expect(credits, item.image).toContain(`\`${item.image}\``);
    }
  });
});
