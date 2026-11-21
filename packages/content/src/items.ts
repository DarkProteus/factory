import type { ItemDef } from './types';

export const items = {
  // Сырьё и топливо.
  ironOre: { name: 'Железная руда', stack: 50 },
  copperOre: { name: 'Медная руда', stack: 50 },
  coal: { name: 'Уголь', stack: 50, fuel: 4000 },
  stone: { name: 'Камень', stack: 50 },
  // Продукты плавки и крафта.
  ironPlate: { name: 'Железная пластина', stack: 100 },
  copperPlate: { name: 'Медная пластина', stack: 100 },
  stoneBrick: { name: 'Кирпич', stack: 100 },
  ironGear: { name: 'Шестерня', stack: 100 },
  copperCable: { name: 'Медный провод', stack: 200 },
  circuit: { name: 'Электросхема', stack: 200 },
  ammo: { name: 'Патроны', stack: 100 },
  steelPlate: { name: 'Стальная пластина', stack: 100 },
  sciencePackRed: { name: 'Красный научный пакет', stack: 200 },
  sciencePackGreen: { name: 'Зелёный научный пакет', stack: 200 },
  // Предметы-здания: id совпадает с id здания.
  drill: { name: 'Бур', stack: 50 },
  belt: { name: 'Конвейер', stack: 100 },
  furnace: { name: 'Печь', stack: 50 },
  inserter: { name: 'Манипулятор', stack: 50 },
  chest: { name: 'Сундук', stack: 50 },
  splitter: { name: 'Разделитель', stack: 50 },
  assembler: { name: 'Сборщик', stack: 50 },
  pole: { name: 'Столб', stack: 100 },
  generator: { name: 'Генератор', stack: 50 },
  lab: { name: 'Лаборатория', stack: 50 },
  undergroundBelt: { name: 'Подземный конвейер', stack: 50 },
  fastUndergroundBelt: { name: 'Быстрый подземный конвейер', stack: 50 },
  fastBelt: { name: 'Быстрый конвейер', stack: 100 },
  fastInserter: { name: 'Быстрый манипулятор', stack: 50 },
  filterSplitter: { name: 'Фильтрующий разделитель', stack: 50 },
} satisfies Record<string, ItemDef>;

/** id предмета из таблицы items. */
export type ItemId = keyof typeof items;
