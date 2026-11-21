import type { ItemId } from './items';
import type { RecipeId } from './recipes';
import type { TechnologyDef } from './types';

/** id технологии из таблицы technologies. Список явный: requires ссылается на ту же таблицу. */
export type TechId =
  | 'logistics'
  | 'undergroundBelts'
  | 'scienceGreen'
  | 'fastInserter'
  | 'steel'
  | 'filterSplitter'
  | 'fastBelt';

// Единица красного уровня — 10 с (600 тиков), с зелёным пакетом — 15 с (900 тиков).
const RED = { sciencePackRed: 1 } as const;
const RED_GREEN = { sciencePackRed: 1, sciencePackGreen: 1 } as const;

export const technologies = {
  logistics: { name: 'Логистика', unit: RED, units: 10, unitTicks: 600, requires: [], unlocks: ['splitter'] },
  undergroundBelts: {
    name: 'Подземные конвейеры',
    unit: RED,
    units: 20,
    unitTicks: 600,
    requires: ['logistics'],
    unlocks: ['undergroundBelt'],
  },
  scienceGreen: {
    name: 'Зелёная наука',
    unit: RED,
    units: 30,
    unitTicks: 600,
    requires: [],
    unlocks: ['sciencePackGreen'],
  },
  fastInserter: {
    name: 'Быстрый манипулятор',
    unit: RED_GREEN,
    units: 30,
    unitTicks: 900,
    requires: ['scienceGreen'],
    unlocks: ['fastInserter'],
  },
  steel: { name: 'Сталь', unit: RED_GREEN, units: 40, unitTicks: 900, requires: ['scienceGreen'], unlocks: ['steelPlate'] },
  filterSplitter: {
    name: 'Фильтрующий разделитель',
    unit: RED_GREEN,
    units: 50,
    unitTicks: 900,
    requires: ['logistics', 'scienceGreen'],
    unlocks: ['filterSplitter'],
  },
  fastBelt: {
    name: 'Быстрые конвейеры',
    unit: RED_GREEN,
    units: 75,
    unitTicks: 900,
    requires: ['logistics', 'steel'],
    unlocks: ['fastBelt', 'fastUndergroundBelt'],
  },
} satisfies Record<TechId, TechnologyDef<ItemId, TechId, RecipeId>>;
