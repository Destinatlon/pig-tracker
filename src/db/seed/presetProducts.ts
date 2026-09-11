import { NutritionPer100g } from '../../domain/models';

/** Languages migration 001 seeds category names in. Other locales fall back to English. */
export type PresetLanguage = 'en' | 'uk';

export type PresetCategory =
  | 'dairy'
  | 'meat'
  | 'fish'
  | 'grains'
  | 'vegetables'
  | 'fruit'
  | 'drinks'
  | 'snacks'
  | 'other';

export interface PresetProduct extends NutritionPer100g {
  category: PresetCategory;
  /** Ukrainian product name, seeded as-is; the user renames it like any other product. */
  name: string;
}

/**
 * Category names as seeded by migration 001, in both languages: the seeder matches an existing
 * category by whichever name that install got, and falls back to Uncategorized when the user has
 * since renamed or deleted it.
 */
export const PRESET_CATEGORY_NAMES: Record<PresetCategory, Record<PresetLanguage, string>> = {
  dairy: { en: 'Dairy', uk: 'Молочне' },
  meat: { en: 'Meat', uk: "М'ясо" },
  fish: { en: 'Fish', uk: 'Риба' },
  grains: { en: 'Grains', uk: 'Крупи' },
  vegetables: { en: 'Vegetables', uk: 'Овочі' },
  fruit: { en: 'Fruit', uk: 'Фрукти' },
  drinks: { en: 'Drinks', uk: 'Напої' },
  snacks: { en: 'Snacks', uk: 'Снеки' },
  other: { en: 'Other', uk: 'Інше' },
};

/**
 * Reference values per 100 g of the raw/edible product, from public food-composition tables.
 * They are ordinary editable data once seeded: the user is expected to correct them against the
 * packaging they actually buy. A macro is null only where no reliable value exists, never 0.
 */
export const PRESET_PRODUCTS: readonly PresetProduct[] = [
  // ── Vegetables ────────────────────────────────────────────────────────────
  { category: 'vegetables', name: 'Картопля', caloriesPer100g: 77, proteinPer100g: 2, carbsPer100g: 17.5, fatPer100g: 0.1 },
  { category: 'vegetables', name: 'Морква', caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 9.6, fatPer100g: 0.2 },
  { category: 'vegetables', name: 'Буряк', caloriesPer100g: 43, proteinPer100g: 1.6, carbsPer100g: 9.6, fatPer100g: 0.2 },
  { category: 'vegetables', name: 'Капуста білокачанна', caloriesPer100g: 25, proteinPer100g: 1.3, carbsPer100g: 5.8, fatPer100g: 0.1 },
  { category: 'vegetables', name: 'Квашена капуста', caloriesPer100g: 19, proteinPer100g: 0.9, carbsPer100g: 4.3, fatPer100g: 0.1 },
  { category: 'vegetables', name: 'Помідор', caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2 },
  { category: 'vegetables', name: 'Огірок', caloriesPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1 },
  { category: 'vegetables', name: 'Цибуля ріпчаста', caloriesPer100g: 40, proteinPer100g: 1.1, carbsPer100g: 9.3, fatPer100g: 0.1 },
  { category: 'vegetables', name: 'Цибуля зелена', caloriesPer100g: 32, proteinPer100g: 1.8, carbsPer100g: 7.3, fatPer100g: 0.5 },
  { category: 'vegetables', name: 'Часник', caloriesPer100g: 149, proteinPer100g: 6.4, carbsPer100g: 33.1, fatPer100g: 0.5 },
  { category: 'vegetables', name: 'Перець солодкий', caloriesPer100g: 27, proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.3 },
  { category: 'vegetables', name: 'Кабачок', caloriesPer100g: 17, proteinPer100g: 1.2, carbsPer100g: 3.1, fatPer100g: 0.3 },
  { category: 'vegetables', name: 'Баклажан', caloriesPer100g: 25, proteinPer100g: 1, carbsPer100g: 5.9, fatPer100g: 0.2 },
  { category: 'vegetables', name: 'Гарбуз', caloriesPer100g: 26, proteinPer100g: 1, carbsPer100g: 6.5, fatPer100g: 0.1 },
  { category: 'vegetables', name: 'Броколі', caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 6.6, fatPer100g: 0.4 },
  { category: 'vegetables', name: 'Цвітна капуста', caloriesPer100g: 25, proteinPer100g: 1.9, carbsPer100g: 5, fatPer100g: 0.3 },
  { category: 'vegetables', name: 'Печериці', caloriesPer100g: 22, proteinPer100g: 3.1, carbsPer100g: 3.3, fatPer100g: 0.3 },
  { category: 'vegetables', name: 'Горошок зелений', caloriesPer100g: 81, proteinPer100g: 5.4, carbsPer100g: 14.5, fatPer100g: 0.4 },
  { category: 'vegetables', name: 'Квасоля стручкова', caloriesPer100g: 31, proteinPer100g: 1.8, carbsPer100g: 7, fatPer100g: 0.1 },
  { category: 'vegetables', name: 'Кукурудза солодка', caloriesPer100g: 86, proteinPer100g: 3.2, carbsPer100g: 19, fatPer100g: 1.2 },
  { category: 'vegetables', name: 'Шпинат', caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4 },
  { category: 'vegetables', name: 'Салат листовий', caloriesPer100g: 15, proteinPer100g: 1.4, carbsPer100g: 2.9, fatPer100g: 0.2 },
  { category: 'vegetables', name: 'Редиска', caloriesPer100g: 16, proteinPer100g: 0.7, carbsPer100g: 3.4, fatPer100g: 0.1 },

  // ── Meat ──────────────────────────────────────────────────────────────────
  { category: 'meat', name: 'Куряче філе', caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
  { category: 'meat', name: 'Куряче стегно', caloriesPer100g: 177, proteinPer100g: 19.7, carbsPer100g: 0, fatPer100g: 10.9 },
  { category: 'meat', name: 'Куряча гомілка', caloriesPer100g: 172, proteinPer100g: 18, carbsPer100g: 0, fatPer100g: 10.9 },
  { category: 'meat', name: 'Курячі крила', caloriesPer100g: 203, proteinPer100g: 18.3, carbsPer100g: 0, fatPer100g: 14.1 },
  { category: 'meat', name: 'Куряча печінка', caloriesPer100g: 119, proteinPer100g: 16.9, carbsPer100g: 0.7, fatPer100g: 4.8 },
  { category: 'meat', name: 'Філе індички', caloriesPer100g: 114, proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 1.7 },
  { category: 'meat', name: 'Свинина нежирна', caloriesPer100g: 143, proteinPer100g: 21, carbsPer100g: 0, fatPer100g: 6 },
  { category: 'meat', name: 'Свиняча шия', caloriesPer100g: 267, proteinPer100g: 16.1, carbsPer100g: 0, fatPer100g: 22.5 },
  { category: 'meat', name: 'Свиняча корейка', caloriesPer100g: 210, proteinPer100g: 21, carbsPer100g: 0, fatPer100g: 14 },
  { category: 'meat', name: 'Яловичина', caloriesPer100g: 187, proteinPer100g: 18.9, carbsPer100g: 0, fatPer100g: 12.4 },
  { category: 'meat', name: 'Фарш яловичий', caloriesPer100g: 254, proteinPer100g: 17.2, carbsPer100g: 0, fatPer100g: 20 },
  { category: 'meat', name: 'Телятина', caloriesPer100g: 107, proteinPer100g: 19.7, carbsPer100g: 0, fatPer100g: 2.8 },
  { category: 'meat', name: 'Баранина', caloriesPer100g: 209, proteinPer100g: 16.6, carbsPer100g: 0, fatPer100g: 15.3 },
  { category: 'meat', name: 'Кролятина', caloriesPer100g: 136, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 5.5 },
  { category: 'meat', name: 'Печінка яловича', caloriesPer100g: 135, proteinPer100g: 20.4, carbsPer100g: 3.9, fatPer100g: 3.6 },
  { category: 'meat', name: 'Ковбаса варена', caloriesPer100g: 257, proteinPer100g: 12.8, carbsPer100g: 1.5, fatPer100g: 22.2 },
  { category: 'meat', name: 'Ковбаса копчена', caloriesPer100g: 380, proteinPer100g: 17, carbsPer100g: 0.3, fatPer100g: 34 },
  { category: 'meat', name: 'Сосиски', caloriesPer100g: 266, proteinPer100g: 11, carbsPer100g: 2.4, fatPer100g: 23.9 },
  { category: 'meat', name: 'Шинка', caloriesPer100g: 145, proteinPer100g: 18, carbsPer100g: 1.5, fatPer100g: 7.5 },
  { category: 'meat', name: 'Бекон', caloriesPer100g: 417, proteinPer100g: 13, carbsPer100g: 1.3, fatPer100g: 39 },
  { category: 'meat', name: 'Сало', caloriesPer100g: 797, proteinPer100g: 2.4, carbsPer100g: 0, fatPer100g: 89 },

  // ── Fish ──────────────────────────────────────────────────────────────────
  { category: 'fish', name: 'Оселедець', caloriesPer100g: 158, proteinPer100g: 18, carbsPer100g: 0, fatPer100g: 9.6 },
  { category: 'fish', name: 'Оселедець солоний', caloriesPer100g: 217, proteinPer100g: 19, carbsPer100g: 0, fatPer100g: 15.4 },
  { category: 'fish', name: 'Скумбрія', caloriesPer100g: 205, proteinPer100g: 18.6, carbsPer100g: 0, fatPer100g: 13.9 },
  { category: 'fish', name: 'Хек', caloriesPer100g: 86, proteinPer100g: 16.6, carbsPer100g: 0, fatPer100g: 2.2 },
  { category: 'fish', name: 'Мінтай', caloriesPer100g: 72, proteinPer100g: 15.9, carbsPer100g: 0, fatPer100g: 0.9 },
  { category: 'fish', name: 'Лосось', caloriesPer100g: 208, proteinPer100g: 20.4, carbsPer100g: 0, fatPer100g: 13.4 },
  { category: 'fish', name: 'Форель', caloriesPer100g: 141, proteinPer100g: 19.9, carbsPer100g: 0, fatPer100g: 6.2 },
  { category: 'fish', name: 'Тріска', caloriesPer100g: 82, proteinPer100g: 17.8, carbsPer100g: 0, fatPer100g: 0.7 },
  { category: 'fish', name: 'Короп', caloriesPer100g: 127, proteinPer100g: 17.6, carbsPer100g: 0, fatPer100g: 5.6 },
  { category: 'fish', name: 'Щука', caloriesPer100g: 84, proteinPer100g: 18.4, carbsPer100g: 0, fatPer100g: 1.1 },
  { category: 'fish', name: 'Тілапія', caloriesPer100g: 96, proteinPer100g: 20.1, carbsPer100g: 0, fatPer100g: 1.7 },
  { category: 'fish', name: 'Тунець консервований у власному соку', caloriesPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 1 },
  { category: 'fish', name: 'Шпроти в олії', caloriesPer100g: 363, proteinPer100g: 17.4, carbsPer100g: 0, fatPer100g: 32.4 },
  { category: 'fish', name: 'Креветки', caloriesPer100g: 99, proteinPer100g: 20.9, carbsPer100g: 0.2, fatPer100g: 1.7 },
  { category: 'fish', name: 'Кальмари', caloriesPer100g: 92, proteinPer100g: 15.6, carbsPer100g: 3.1, fatPer100g: 1.4 },
  { category: 'fish', name: 'Ікра червона', caloriesPer100g: 249, proteinPer100g: 24.6, carbsPer100g: 4, fatPer100g: 17.9 },

  // ── Grains ────────────────────────────────────────────────────────────────
  { category: 'grains', name: 'Гречка (суха)', caloriesPer100g: 343, proteinPer100g: 13.3, carbsPer100g: 71.5, fatPer100g: 3.4 },
  { category: 'grains', name: 'Гречка варена', caloriesPer100g: 110, proteinPer100g: 4.2, carbsPer100g: 21.3, fatPer100g: 1.1 },
  { category: 'grains', name: 'Рис білий (сухий)', caloriesPer100g: 344, proteinPer100g: 6.7, carbsPer100g: 78.9, fatPer100g: 0.7 },
  { category: 'grains', name: 'Рис білий варений', caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28.2, fatPer100g: 0.3 },
  { category: 'grains', name: 'Рис бурий (сухий)', caloriesPer100g: 337, proteinPer100g: 7.4, carbsPer100g: 72.9, fatPer100g: 2.8 },
  { category: 'grains', name: 'Вівсяні пластівці', caloriesPer100g: 366, proteinPer100g: 11.9, carbsPer100g: 59.5, fatPer100g: 7.2 },
  { category: 'grains', name: 'Вівсянка на воді', caloriesPer100g: 88, proteinPer100g: 3, carbsPer100g: 15, fatPer100g: 1.7 },
  { category: 'grains', name: 'Перлова крупа', caloriesPer100g: 320, proteinPer100g: 9.3, carbsPer100g: 66.9, fatPer100g: 1.1 },
  { category: 'grains', name: 'Ячна крупа', caloriesPer100g: 313, proteinPer100g: 10, carbsPer100g: 65.4, fatPer100g: 1.3 },
  { category: 'grains', name: 'Пшоно', caloriesPer100g: 348, proteinPer100g: 11.5, carbsPer100g: 66.5, fatPer100g: 3.3 },
  { category: 'grains', name: 'Манна крупа', caloriesPer100g: 333, proteinPer100g: 10.3, carbsPer100g: 70.6, fatPer100g: 1 },
  { category: 'grains', name: 'Кукурудзяна крупа', caloriesPer100g: 328, proteinPer100g: 8.3, carbsPer100g: 71, fatPer100g: 1.2 },
  { category: 'grains', name: 'Кускус', caloriesPer100g: 376, proteinPer100g: 12.8, carbsPer100g: 72.4, fatPer100g: 0.6 },
  { category: 'grains', name: 'Булгур', caloriesPer100g: 342, proteinPer100g: 12.3, carbsPer100g: 63.4, fatPer100g: 1.3 },
  { category: 'grains', name: 'Кіноа', caloriesPer100g: 368, proteinPer100g: 14.1, carbsPer100g: 64.2, fatPer100g: 6.1 },
  { category: 'grains', name: 'Макарони (сухі)', caloriesPer100g: 337, proteinPer100g: 10.4, carbsPer100g: 71.5, fatPer100g: 1.1 },
  { category: 'grains', name: 'Макарони варені', caloriesPer100g: 131, proteinPer100g: 5.1, carbsPer100g: 25, fatPer100g: 1.1 },
  { category: 'grains', name: 'Хліб пшеничний', caloriesPer100g: 265, proteinPer100g: 8.5, carbsPer100g: 49, fatPer100g: 3.2 },
  { category: 'grains', name: 'Хліб житній', caloriesPer100g: 214, proteinPer100g: 6.6, carbsPer100g: 41.5, fatPer100g: 1.2 },
  { category: 'grains', name: 'Борошно пшеничне', caloriesPer100g: 342, proteinPer100g: 10.3, carbsPer100g: 70.6, fatPer100g: 1.1 },
  { category: 'grains', name: 'Сочевиця (суха)', caloriesPer100g: 352, proteinPer100g: 24.6, carbsPer100g: 63.4, fatPer100g: 1.1 },
  { category: 'grains', name: 'Квасоля (суха)', caloriesPer100g: 333, proteinPer100g: 21, carbsPer100g: 60, fatPer100g: 1.2 },

  // ── Fruit ─────────────────────────────────────────────────────────────────
  { category: 'fruit', name: 'Яблуко', caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 13.8, fatPer100g: 0.2 },
  { category: 'fruit', name: 'Груша', caloriesPer100g: 57, proteinPer100g: 0.4, carbsPer100g: 15.2, fatPer100g: 0.1 },
  { category: 'fruit', name: 'Банан', caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 22.8, fatPer100g: 0.3 },
  { category: 'fruit', name: 'Апельсин', caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 11.8, fatPer100g: 0.1 },
  { category: 'fruit', name: 'Мандарин', caloriesPer100g: 53, proteinPer100g: 0.8, carbsPer100g: 13.3, fatPer100g: 0.3 },
  { category: 'fruit', name: 'Лимон', caloriesPer100g: 29, proteinPer100g: 1.1, carbsPer100g: 9.3, fatPer100g: 0.3 },
  { category: 'fruit', name: 'Виноград', caloriesPer100g: 69, proteinPer100g: 0.7, carbsPer100g: 18.1, fatPer100g: 0.2 },
  { category: 'fruit', name: 'Слива', caloriesPer100g: 46, proteinPer100g: 0.7, carbsPer100g: 11.4, fatPer100g: 0.3 },
  { category: 'fruit', name: 'Абрикос', caloriesPer100g: 48, proteinPer100g: 1.4, carbsPer100g: 11.1, fatPer100g: 0.4 },
  { category: 'fruit', name: 'Персик', caloriesPer100g: 39, proteinPer100g: 0.9, carbsPer100g: 9.5, fatPer100g: 0.3 },
  { category: 'fruit', name: 'Черешня', caloriesPer100g: 63, proteinPer100g: 1.1, carbsPer100g: 16, fatPer100g: 0.2 },
  { category: 'fruit', name: 'Вишня', caloriesPer100g: 50, proteinPer100g: 1, carbsPer100g: 12.2, fatPer100g: 0.3 },
  { category: 'fruit', name: 'Полуниця', caloriesPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3 },
  { category: 'fruit', name: 'Малина', caloriesPer100g: 52, proteinPer100g: 1.2, carbsPer100g: 11.9, fatPer100g: 0.7 },
  { category: 'fruit', name: 'Чорниця', caloriesPer100g: 57, proteinPer100g: 0.7, carbsPer100g: 14.5, fatPer100g: 0.3 },
  { category: 'fruit', name: 'Смородина чорна', caloriesPer100g: 63, proteinPer100g: 1, carbsPer100g: 15.4, fatPer100g: 0.4 },
  { category: 'fruit', name: 'Кавун', caloriesPer100g: 30, proteinPer100g: 0.6, carbsPer100g: 7.6, fatPer100g: 0.2 },
  { category: 'fruit', name: 'Диня', caloriesPer100g: 34, proteinPer100g: 0.8, carbsPer100g: 8.2, fatPer100g: 0.2 },
  { category: 'fruit', name: 'Ківі', caloriesPer100g: 61, proteinPer100g: 1.1, carbsPer100g: 14.7, fatPer100g: 0.5 },
  { category: 'fruit', name: 'Ананас', caloriesPer100g: 50, proteinPer100g: 0.5, carbsPer100g: 13.1, fatPer100g: 0.1 },
  { category: 'fruit', name: 'Авокадо', caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 8.5, fatPer100g: 14.7 },

  // ── Drinks (values per 100 ml) ────────────────────────────────────────────
  { category: 'drinks', name: 'Вода', caloriesPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 },
  { category: 'drinks', name: 'Чай чорний без цукру', caloriesPer100g: 1, proteinPer100g: 0, carbsPer100g: 0.2, fatPer100g: 0 },
  { category: 'drinks', name: 'Кава чорна', caloriesPer100g: 2, proteinPer100g: 0.2, carbsPer100g: 0, fatPer100g: 0 },
  { category: 'drinks', name: 'Кава з молоком без цукру', caloriesPer100g: 30, proteinPer100g: 1.6, carbsPer100g: 2.4, fatPer100g: 1.5 },
  { category: 'drinks', name: 'Сік апельсиновий', caloriesPer100g: 45, proteinPer100g: 0.7, carbsPer100g: 10.4, fatPer100g: 0.2 },
  { category: 'drinks', name: 'Сік яблучний', caloriesPer100g: 46, proteinPer100g: 0.1, carbsPer100g: 11.3, fatPer100g: 0.1 },
  { category: 'drinks', name: 'Сік томатний', caloriesPer100g: 17, proteinPer100g: 0.8, carbsPer100g: 3.5, fatPer100g: 0.1 },
  { category: 'drinks', name: 'Кола', caloriesPer100g: 42, proteinPer100g: 0, carbsPer100g: 10.6, fatPer100g: 0 },
  { category: 'drinks', name: 'Кола без цукру', caloriesPer100g: 0.3, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 },
  { category: 'drinks', name: 'Лимонад', caloriesPer100g: 40, proteinPer100g: 0, carbsPer100g: 10, fatPer100g: 0 },
  { category: 'drinks', name: 'Компот із сухофруктів', caloriesPer100g: 60, proteinPer100g: 0.2, carbsPer100g: 15, fatPer100g: 0 },
  { category: 'drinks', name: 'Квас', caloriesPer100g: 27, proteinPer100g: 0.2, carbsPer100g: 5.2, fatPer100g: 0 },
  { category: 'drinks', name: 'Пиво світле', caloriesPer100g: 43, proteinPer100g: 0.5, carbsPer100g: 3.6, fatPer100g: 0 },
  { category: 'drinks', name: 'Вино червоне сухе', caloriesPer100g: 68, proteinPer100g: 0.1, carbsPer100g: 2.6, fatPer100g: 0 },
  { category: 'drinks', name: 'Горілка', caloriesPer100g: 231, proteinPer100g: 0, carbsPer100g: 0.1, fatPer100g: 0 },

  // ── Snacks ────────────────────────────────────────────────────────────────
  { category: 'snacks', name: 'Чипси картопляні', caloriesPer100g: 536, proteinPer100g: 6.6, carbsPer100g: 53, fatPer100g: 34.6 },
  { category: 'snacks', name: 'Арахіс смажений', caloriesPer100g: 587, proteinPer100g: 24.4, carbsPer100g: 21.5, fatPer100g: 49.7 },
  { category: 'snacks', name: 'Волоські горіхи', caloriesPer100g: 654, proteinPer100g: 15.2, carbsPer100g: 13.7, fatPer100g: 65.2 },
  { category: 'snacks', name: 'Мигдаль', caloriesPer100g: 579, proteinPer100g: 21.2, carbsPer100g: 21.6, fatPer100g: 49.9 },
  { category: 'snacks', name: "Кеш'ю", caloriesPer100g: 553, proteinPer100g: 18.2, carbsPer100g: 30.2, fatPer100g: 43.9 },
  { category: 'snacks', name: 'Фундук', caloriesPer100g: 628, proteinPer100g: 15, carbsPer100g: 16.7, fatPer100g: 60.8 },
  { category: 'snacks', name: 'Насіння соняшнику', caloriesPer100g: 601, proteinPer100g: 20.7, carbsPer100g: 20, fatPer100g: 53 },
  { category: 'snacks', name: 'Шоколад молочний', caloriesPer100g: 535, proteinPer100g: 7.6, carbsPer100g: 59.4, fatPer100g: 29.7 },
  { category: 'snacks', name: 'Шоколад чорний', caloriesPer100g: 546, proteinPer100g: 4.9, carbsPer100g: 61.2, fatPer100g: 31.3 },
  { category: 'snacks', name: 'Печиво', caloriesPer100g: 450, proteinPer100g: 6, carbsPer100g: 68, fatPer100g: 17 },
  { category: 'snacks', name: 'Вафлі', caloriesPer100g: 425, proteinPer100g: 8.2, carbsPer100g: 62, fatPer100g: 20 },
  { category: 'snacks', name: 'Попкорн', caloriesPer100g: 387, proteinPer100g: 12.9, carbsPer100g: 77.9, fatPer100g: 4.5 },
  { category: 'snacks', name: 'Сухарики', caloriesPer100g: 390, proteinPer100g: 11, carbsPer100g: 72, fatPer100g: 6 },
  { category: 'snacks', name: 'Халва', caloriesPer100g: 522, proteinPer100g: 11.6, carbsPer100g: 54, fatPer100g: 29.7 },
  { category: 'snacks', name: 'Морозиво пломбір', caloriesPer100g: 227, proteinPer100g: 3.7, carbsPer100g: 23.6, fatPer100g: 13.7 },

  // ── Dairy ─────────────────────────────────────────────────────────────────
  { category: 'dairy', name: 'Молоко 2,5%', caloriesPer100g: 52, proteinPer100g: 2.8, carbsPer100g: 4.7, fatPer100g: 2.5 },
  { category: 'dairy', name: 'Кефір 2,5%', caloriesPer100g: 51, proteinPer100g: 2.9, carbsPer100g: 4, fatPer100g: 2.5 },
  { category: 'dairy', name: 'Ряжанка 4%', caloriesPer100g: 67, proteinPer100g: 2.8, carbsPer100g: 4.2, fatPer100g: 4 },
  { category: 'dairy', name: 'Сметана 20%', caloriesPer100g: 206, proteinPer100g: 2.8, carbsPer100g: 3.2, fatPer100g: 20 },
  { category: 'dairy', name: 'Сир кисломолочний 5%', caloriesPer100g: 121, proteinPer100g: 17, carbsPer100g: 1.8, fatPer100g: 5 },
  { category: 'dairy', name: 'Сир кисломолочний 9%', caloriesPer100g: 159, proteinPer100g: 16.7, carbsPer100g: 2, fatPer100g: 9 },
  { category: 'dairy', name: 'Сир твердий', caloriesPer100g: 364, proteinPer100g: 24.1, carbsPer100g: 0.3, fatPer100g: 29.5 },
  { category: 'dairy', name: 'Сир плавлений', caloriesPer100g: 257, proteinPer100g: 13, carbsPer100g: 4, fatPer100g: 21 },
  { category: 'dairy', name: 'Бринза', caloriesPer100g: 260, proteinPer100g: 17.9, carbsPer100g: 0, fatPer100g: 20.1 },
  { category: 'dairy', name: 'Масло вершкове 82%', caloriesPer100g: 748, proteinPer100g: 0.5, carbsPer100g: 0.8, fatPer100g: 82.5 },
  { category: 'dairy', name: 'Йогурт натуральний', caloriesPer100g: 61, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3 },

  // ── Other ─────────────────────────────────────────────────────────────────
  { category: 'other', name: 'Яйце куряче', caloriesPer100g: 157, proteinPer100g: 12.7, carbsPer100g: 0.7, fatPer100g: 11.5 },
  { category: 'other', name: 'Олія соняшникова', caloriesPer100g: 899, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 99.9 },
  { category: 'other', name: 'Цукор', caloriesPer100g: 399, proteinPer100g: 0, carbsPer100g: 99.8, fatPer100g: 0 },
  { category: 'other', name: 'Мед', caloriesPer100g: 329, proteinPer100g: 0.8, carbsPer100g: 81.5, fatPer100g: 0 },
  { category: 'other', name: 'Майонез 67%', caloriesPer100g: 627, proteinPer100g: 2.4, carbsPer100g: 2.6, fatPer100g: 67 },
  { category: 'other', name: 'Кетчуп', caloriesPer100g: 93, proteinPer100g: 1.3, carbsPer100g: 22.8, fatPer100g: 0.2 },
];
