// Русские названия зданий для интерфейса. Это текст интерфейса, а не данные content:
// id здания остаётся английским, неизвестный id показывается как есть.
const NAMES: Record<string, string> = {
  drill: 'Бур',
  belt: 'Конвейер',
  furnace: 'Печь',
  inserter: 'Манипулятор',
  chest: 'Сундук',
};

export const buildingName = (id: string): string => NAMES[id] ?? id;
