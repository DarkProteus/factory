import { createState, runTicks, type Command, type PlacedBuilding, type ScheduledCommand, type SimState } from '@factory/sim';
import { deserialize, serialize } from './index';

const E = 1;
export const build = (building: string, x: number, y: number): Command => ({ type: 'build', building, x, y, dir: E });

/** Бур -> конвейеры -> манипулятор -> печь -> манипулятор -> сундук. */
const BUILD: ScheduledCommand[] = [
  { tick: 0, command: build('drill', 0, 0) },
  // Второй бур упирается в пустую клетку: его выходной буфер заполняется.
  { tick: 0, command: build('drill', 0, 4) },
  { tick: 0, command: build('belt', 2, 0) },
  { tick: 0, command: build('belt', 3, 0) },
  { tick: 0, command: build('belt', 4, 0) },
  { tick: 0, command: build('inserter', 5, 0) },
  { tick: 0, command: build('furnace', 6, 0) },
  { tick: 0, command: build('inserter', 8, 0) },
  { tick: 0, command: build('chest', 9, 0) },
  // Электросеть для буров и манипуляторов: столбы и генератор (уголь кладётся отдельно).
  { tick: 0, command: build('pole', 3, 2) },
  { tick: 0, command: build('pole', 8, 2) },
  { tick: 0, command: build('generator', 3, 4) },
  { tick: 0, command: { type: 'setCounter', key: 'score', value: 7 } },
];

/** Команды, которые идут и до, и после сохранения: ломаем и перестраиваем часть линии. */
export const LATER: ScheduledCommand[] = [
  { tick: 1100, command: { type: 'rollCounter', key: 'roll' } },
  { tick: 1200, command: { type: 'demolish', x: 3, y: 0 } },
  { tick: 1300, command: build('belt', 3, 0) },
  { tick: 1400, command: { type: 'rollCounter', key: 'roll2' } },
];

export function factory(): SimState {
  const state = createState(12345, { width: 16, height: 16, deposits: [
      { x: 0, y: 0, item: 'ironOre', amount: 5000 },
      { x: 0, y: 4, item: 'ironOre', amount: 5000 },
    ] });
  // Постройка тратит предмет-здание; снесённый конвейер возвращается в инвентарь и уходит на перестройку.
  state.inventory = [
    { item: 'drill', count: 2 },
    { item: 'belt', count: 3 },
    { item: 'inserter', count: 2 },
    { item: 'furnace', count: 1 },
    { item: 'chest', count: 1 },
    { item: 'pole', count: 2 },
    { item: 'generator', count: 1 },
  ];
  runTicks(state, BUILD, 1);
  // Печь жжёт уголь: кладём топливо, чтобы цикл шёл и остаток энергии попал в сохранение.
  Object.values(state.buildings).find((b) => b.type === 'furnace')!.fuel = { item: 'coal', count: 10 };
  Object.values(state.buildings).find((b) => b.type === 'generator')!.fuel = { item: 'coal', count: 10 };
  runTicks(state, BUILD, 399);
  state.inventory = [
    { item: 'ironPlate', count: 40 },
    { item: 'ammo', count: 3 },
  ];
  return state;
}

export const roundtrip = (state: SimState): SimState => deserialize(serialize(state));
export const all = (state: SimState): PlacedBuilding[] => Object.values(state.buildings);
