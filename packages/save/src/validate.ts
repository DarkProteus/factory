import { buildings, items, recipes } from '@factory/content';
import type { SimState } from '@factory/sim';
import { SaveError } from './errors';

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function fail(where: string, what: string): never {
  throw new SaveError(`Сохранение повреждено: ${where} — ${what}.`);
}

function checkItem(item: unknown, where: string): void {
  if (typeof item !== 'string' || !Object.hasOwn(items, item)) {
    throw new SaveError(`В сохранении есть предмет «${String(item)}», которого нет в игре (${where}).`);
  }
}

function checkStack(stack: unknown, where: string): void {
  if (!isObject(stack)) fail(where, 'ожидалась стопка предметов');
  checkItem(stack.item, where);
  if (!Number.isInteger(stack.count) || (stack.count as number) <= 0) fail(where, 'неверное количество');
}

function checkStacks(list: unknown, where: string): void {
  if (!Array.isArray(list)) fail(where, 'ожидался список');
  list.forEach((s, i) => checkStack(s, `${where}[${i}]`));
}

function checkMap(map: unknown): void {
  if (!isObject(map)) fail('карта', 'ожидался объект');
  const { width, height } = map;
  if (!Number.isInteger(width) || !Number.isInteger(height) || (width as number) <= 0 || (height as number) <= 0) {
    fail('карта', 'неверный размер');
  }
  const size = (width as number) * (height as number);
  for (const key of ['tiles', 'deposits', 'occupancy'] as const) {
    const arr = map[key];
    if (!Array.isArray(arr) || arr.length !== size) fail(`карта.${key}`, `ожидался массив длиной ${size}`);
  }
  (map.deposits as unknown[]).forEach((d, i) => {
    if (d === null) return;
    if (!isObject(d)) fail(`залежь ${i}`, 'ожидался объект или null');
    checkItem(d.item, `залежь ${i}`);
    if (!Number.isFinite(d.amount)) fail(`залежь ${i}`, 'неверное количество');
    if (!Number.isFinite(d.initial) || (d.initial as number) <= 0) fail(`залежь ${i}`, 'неверный исходный запас');
    if ((d.amount as number) > (d.initial as number)) fail(`залежь ${i}`, 'остаток больше исходного запаса');
  });
}

function checkBuilding(key: string, b: unknown): void {
  const where = `здание ${key}`;
  if (!isObject(b)) fail(where, 'ожидался объект');
  if (typeof b.type !== 'string' || !Object.hasOwn(buildings, b.type)) {
    throw new SaveError(`В сохранении есть здание «${String(b.type)}», которого нет в игре (${where}).`);
  }
  if (b.id !== Number(key)) fail(where, 'id не совпадает с ключом');
  for (const f of ['x', 'y', 'progress'] as const) {
    if (!Number.isFinite(b[f])) fail(where, `неверное поле ${f}`);
  }
  if (![0, 1, 2, 3].includes(b.dir as number)) fail(where, 'неверное направление');
  if (b.output !== null) checkStack(b.output, `${where}.output`);
  if (b.input !== undefined) checkStacks(b.input, `${where}.input`);
  if (b.slots !== undefined) checkStacks(b.slots, `${where}.slots`);
  if (b.recipe !== undefined && (typeof b.recipe !== 'string' || !Object.hasOwn(recipes, b.recipe))) {
    fail(where, `неизвестный рецепт «${String(b.recipe)}»`);
  }
  if (b.belt !== undefined) {
    if (!Array.isArray(b.belt)) fail(where, 'belt: ожидался список');
    b.belt.forEach((it: unknown, i) => {
      if (!isObject(it) || !Number.isFinite(it.pos)) fail(where, `belt[${i}]: неверный предмет`);
      checkItem(it.item, `${where}.belt[${i}]`);
    });
  }
}

function checkMining(mining: unknown): void {
  if (mining === null) return;
  if (!isObject(mining)) fail('добыча', 'ожидался объект или null');
  for (const f of ['x', 'y', 'progress'] as const) {
    if (!Number.isInteger(mining[f]) || (mining[f] as number) < 0) fail('добыча', `неверное поле ${f}`);
  }
}

/** Проверяет форму разобранного JSON и ссылки на content; при ошибке бросает SaveError. */
export function validateState(state: unknown): SimState {
  if (!isObject(state)) fail('состояние', 'ожидался объект');
  for (const f of ['tick', 'rng', 'nextId'] as const) {
    if (!Number.isInteger(state[f])) fail('состояние', `неверное поле ${f}`);
  }
  if (!isObject(state.counters)) fail('состояние', 'неверное поле counters');
  checkMap(state.map);
  if (!isObject(state.buildings)) fail('состояние', 'неверное поле buildings');
  for (const [key, b] of Object.entries(state.buildings)) checkBuilding(key, b);
  checkStacks(state.inventory, 'инвентарь');
  checkMining(state.mining);
  return state as unknown as SimState;
}
