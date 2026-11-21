import { items } from '@factory/content';

// Русские названия зданий и предметов для интерфейса. Это текст интерфейса, а не данные content:
// id здания остаётся английским, неизвестный id показывается как есть.
const NAMES: Record<string, string> = {
  drill: 'Бур',
  belt: 'Конвейер',
  furnace: 'Печь',
  inserter: 'Манипулятор',
  chest: 'Сундук',
  splitter: 'Разделитель',
  filterSplitter: 'Фильтрующий разделитель',
  assembler: 'Сборщик',
  pole: 'Столб',
  generator: 'Генератор',
};

/** Название здания: свой словарь, затем название предмета-здания из content.items, иначе id. */
export const buildingName = (id: string): string => NAMES[id] ?? itemName(id);

/** Название предмета: из content.items, неизвестный id показывается как есть. */
export const itemName = (id: string): string => (Object.hasOwn(items, id) ? items[id as keyof typeof items].name : id);
