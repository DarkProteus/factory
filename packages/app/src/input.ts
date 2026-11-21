// Ввод игрока без DOM и PixiJS: инструмент, клетка под курсором, якорь призрака,
// очередь команд и оверлей. Всё чистые функции, состояние sim только читается.
// Менять состояние можно лишь командами через CommandQueue -> tick(state, commands).
import { buildings, recipes as contentRecipes, type BuildingDef } from '@factory/content';
import { CELL, type Overlay } from '@factory/render';
import { canPlace, depositAt, footprintSize, isUnlocked, type Command, type Dir, type ItemStack, type SimState } from '@factory/sim';

export type Tool = { kind: 'none' } | { kind: 'build'; building: string } | { kind: 'demolish' } | { kind: 'mine' };

export interface Cell {
  x: number;
  y: number;
}

export const NO_TOOL: Tool = { kind: 'none' };

/** Клетка по мировым координатам в px. */
export function cellAt(worldX: number, worldY: number): Cell {
  return { x: Math.floor(worldX / CELL), y: Math.floor(worldY / CELL) };
}

/**
 * Якорь призрака — левая верхняя клетка отпечатка. Курсор указывает на центр
 * отпечатка: у 1×1 якорь совпадает с клеткой, у 2×2 сдвигается на клетку влево и вверх.
 */
export function ghostAnchor(cell: Cell, size: readonly [number, number], dir: Dir): Cell {
  const [w, h] = footprintSize(size, dir);
  return { x: cell.x - Math.floor(w / 2), y: cell.y - Math.floor(h / 2) };
}

export const rotateDir = (dir: Dir): Dir => ((dir + 1) % 4) as Dir;

/** Очередь команд: интерфейс кладёт сюда, игровой цикл забирает на ближайшем тике. */
export class CommandQueue {
  private items: Command[] = [];

  push(command: Command): void {
    this.items.push(command);
  }

  /** Отдаёт накопленные команды и очищает очередь. */
  drain(): Command[] {
    const out = this.items;
    this.items = [];
    return out;
  }

  get length(): number {
    return this.items.length;
  }
}

export interface ToolState {
  tool: Tool;
  dir: Dir;
}

/** Id зданий для клавиш 1–9 — по порядку content.buildings. */
export const buildingIds = (defs: Readonly<Record<string, BuildingDef>> = buildings): string[] => Object.keys(defs);

/**
 * Здания, видимые на панели стройки: рецепт предмета-здания открыт исследованиями
 * либо предмет уже лежит в инвентаре (закрытое здание из инвентаря ставится). Здание без рецепта видно всегда.
 */
export function visibleBuildingIds(
  state: SimState,
  ids: readonly string[] = buildingIds(),
  recipes: Readonly<Record<string, unknown>> = contentRecipes,
): string[] {
  return ids.filter((id) => !Object.hasOwn(recipes, id) || isUnlocked(state, id) || itemCount(state.inventory, id) > 0);
}

/** Сколько предметов с этим id в инвентаре (предмет-здание имеет id здания). */
export function itemCount(inventory: readonly ItemStack[], item: string): number {
  return inventory.reduce((sum, st) => (st.item === item ? sum + st.count : sum), 0);
}

/** Сколько экземпляров здания у игрока; по умолчанию без ограничения (для тестов раскладки клавиш). */
export type Owned = (building: string) => number;
const unlimited: Owned = () => Infinity;

/** Если выбранное для стройки здание кончилось, режим стройки сбрасывается. */
export function dropEmptyTool(state: SimState, s: ToolState): ToolState {
  if (s.tool.kind !== 'build' || itemCount(state.inventory, s.tool.building) > 0) return s;
  return { ...s, tool: NO_TOOL };
}

/** Выбор здания: повторный выбор того же снимает инструмент; здание без предметов не выбирается. */
export function selectBuilding(s: ToolState, building: string, owned: Owned = unlimited): ToolState {
  if (owned(building) <= 0) return s;
  const same = s.tool.kind === 'build' && s.tool.building === building;
  return { ...s, tool: same ? NO_TOOL : { kind: 'build', building } };
}

export function selectDemolish(s: ToolState): ToolState {
  return { ...s, tool: s.tool.kind === 'demolish' ? NO_TOOL : { kind: 'demolish' } };
}

/** Кирка: повторный выбор снимает инструмент; стройка и снос вытесняются, как при выборе здания. */
export function selectMine(s: ToolState): ToolState {
  return { ...s, tool: s.tool.kind === 'mine' ? NO_TOOL : { kind: 'mine' } };
}

/** Горячие клавиши по KeyboardEvent.code; неизвестная клавиша состояние не меняет. */
export function applyKey(
  s: ToolState,
  code: string,
  ids: readonly string[] = buildingIds(),
  owned: Owned = unlimited,
): ToolState {
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(code);
  if (digit) {
    const id = ids[Number(digit[1]) - 1];
    return id === undefined ? s : selectBuilding(s, id, owned);
  }
  if (code === 'KeyX') return selectDemolish(s);
  if (code === 'KeyM') return selectMine(s);
  if (code === 'KeyR') return { ...s, dir: rotateDir(s.dir) };
  if (code === 'Escape') return { ...s, tool: NO_TOOL };
  return s;
}

/** Команда на клик левой кнопкой: поставить (только если место свободно) или снести. */
export function clickCommand(state: SimState, s: ToolState, cell: Cell): Command | null {
  if (s.tool.kind === 'demolish') return { type: 'demolish', x: cell.x, y: cell.y };
  if (s.tool.kind !== 'build') return null;
  const def = buildings[s.tool.building as keyof typeof buildings];
  if (!def || itemCount(state.inventory, s.tool.building) <= 0) return null;
  const a = ghostAnchor(cell, def.size, s.dir);
  if (!canPlace(state, s.tool.building, a.x, a.y, s.dir)) return null;
  return { type: 'build', building: s.tool.building, x: a.x, y: a.y, dir: s.dir };
}

/**
 * Шаг ручной добычи; вызывается каждый кадр. `mined` — клетка, на которой уже
 * послан startMining. Добыча идёт, пока выбрана кирка, кнопка зажата и курсор
 * стоит на клетке с залежью; в остальных случаях шлётся stopMining.
 * Смена клетки на другую залежь шлёт startMining заново.
 */
export function miningStep(
  state: SimState,
  s: ToolState,
  mined: Cell | null,
  down: boolean,
  cell: Cell | null,
): { mined: Cell | null; command: Command | null } {
  const target = s.tool.kind === 'mine' && down && cell && depositAt(state, cell.x, cell.y) ? cell : null;
  if (!target) return { mined: null, command: mined ? { type: 'stopMining' } : null };
  if (mined && mined.x === target.x && mined.y === target.y) return { mined, command: null };
  return { mined: target, command: { type: 'startMining', x: target.x, y: target.y } };
}

/** Оверлей для рендера: призрак со сеткой при стройке, рамка под курсором иначе. */
export function overlayFor(state: SimState, s: ToolState, cell: Cell | null): Overlay | null {
  if (!cell) return null;
  if (s.tool.kind === 'build') {
    const def: BuildingDef | undefined = buildings[s.tool.building as keyof typeof buildings];
    if (!def) return null;
    const a = ghostAnchor(cell, def.size, s.dir);
    const valid = canPlace(state, s.tool.building, a.x, a.y, s.dir);
    const zones = def.behavior === 'pole' || def.energy?.kind === 'electric' || def.energy?.kind === 'generator';
    return { ghost: { building: s.tool.building, x: a.x, y: a.y, dir: s.dir, valid }, grid: true, zones };
  }
  return { highlight: { x: cell.x, y: cell.y, demolish: s.tool.kind === 'demolish' }, grid: false };
}
