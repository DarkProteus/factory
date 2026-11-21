// Раскладка завода пакетов для теста готовности M3 (milestone3.test.ts). Здесь только расстановка, расчётов нет.
import { buildings, type BuildingDef } from '@factory/content';
import { canPlace, demolishAt, footprintSize, placeBuilding } from './buildings';
import { buildingAt, tick, type Command, type Dir, type SimState } from './index';
import { powerNetworks } from './network';
import { give } from './testKit';

const build = (building: string, x: number, y: number, dir: Dir = 1): Command => ({ type: 'build', building, x, y, dir });
const E: Dir = 1;
const S: Dir = 2;
const W: Dir = 3;
const N: Dir = 0;

/** Сколько модулей и где стоит первый; шаг между модулями по x. */
export const MODULE_STEP = 20;
export const MODULES = 4;
export const ORIGIN = { x: 2, y: 11 };
/** Генераторы стоят справа от модулей. */
export const GENERATORS = 4;
export const MAP = { width: 90, height: 26 };

type Stock = readonly [item: string, stacks: number];
const stack = (item: string, stacks: number, size: number) => Array.from({ length: stacks }, () => ({ item, count: size }));

/**
 * Один модуль (ox, oy) — лаборатория и всё, что их кормит. Всё передаётся «источник → манипулятор → здание»:
 *   красный: сундук железа → сборщик шестерён GA → сборщик красных R ← сундук меди; R → манипулятор → сундук-узел H.
 *   зелёный: GB (шестерни) → сборщик манипуляторов IA ← сундук S1 (железо + схемы);
 *            GC (шестерни) → сборщик конвейеров BA ← сундук S2 (железо);
 *            IA и BA → сборщик зелёных Gr → манипулятор → H.
 *   H → манипулятор → лаборатория над узлом.
 * Одна лаборатория на модуль: лаборатория копит пакеты до стопки, и вторая на том же узле голодала бы.
 * Возвращает команды постройки и запасы сундуков (клетка и стопки).
 */
function module(ox: number, oy: number): { cmds: Command[]; stocks: [number, number, readonly Stock[]][] } {
  const iron: Stock = ['ironPlate', 3];
  const cmds: Command[] = [
    // красная линия
    build('chest', ox, oy + 1), build('inserter', ox + 1, oy + 1, E), build('assembler', ox + 2, oy),
    build('inserter', ox + 5, oy + 1, E), build('assembler', ox + 6, oy),
    build('chest', ox + 7, oy - 2), build('inserter', ox + 7, oy - 1, S),
    build('inserter', ox + 9, oy + 1, E), build('chest', ox + 10, oy + 1),
    // лаборатория над узлом
    build('lab', ox + 9, oy - 3), build('inserter', ox + 10, oy, N),
    // зелёная линия: Gr (ox+12, oy), IA сверху, BA снизу
    build('assembler', ox + 12, oy), build('inserter', ox + 11, oy + 1, W),
    build('assembler', ox + 12, oy - 4), build('inserter', ox + 13, oy - 1, S),
    build('chest', ox + 16, oy - 3), build('inserter', ox + 15, oy - 3, W),
    build('assembler', ox + 12, oy - 8), build('inserter', ox + 13, oy - 5, S),
    build('chest', ox + 13, oy - 10), build('inserter', ox + 13, oy - 9, S),
    build('assembler', ox + 12, oy + 4), build('inserter', ox + 13, oy + 3, N),
    build('chest', ox + 16, oy + 5), build('inserter', ox + 15, oy + 5, W),
    build('assembler', ox + 12, oy + 8), build('inserter', ox + 13, oy + 7, N),
    build('chest', ox + 13, oy + 12), build('inserter', ox + 13, oy + 11, N),
  ];
  const stocks: [number, number, readonly Stock[]][] = [
    [ox, oy + 1, [iron]], [ox + 7, oy - 2, [['copperPlate', 2]]], [ox + 13, oy - 10, [iron]], [ox + 13, oy + 12, [iron]],
    [ox + 16, oy - 3, [['ironPlate', 1], ['circuit', 1]]], [ox + 16, oy + 5, [['ironPlate', 1]]],
  ];
  return { cmds, stocks };
}

/** Роли сборщиков модуля: клетка левого верхнего угла и рецепт. `late` — рецепт открывается технологией. */
export function roles(ox: number, oy: number): { x: number; y: number; recipe: string; late?: true }[] {
  return [
    { x: ox + 2, y: oy, recipe: 'ironGear' }, { x: ox + 6, y: oy, recipe: 'sciencePackRed' },
    { x: ox + 12, y: oy - 8, recipe: 'ironGear' }, { x: ox + 12, y: oy - 4, recipe: 'inserter' },
    { x: ox + 12, y: oy + 8, recipe: 'ironGear' }, { x: ox + 12, y: oy + 4, recipe: 'belt' },
    { x: ox + 12, y: oy, recipe: 'sciencePackGreen', late: true },
  ];
}

/** Сборщик зелёных пакетов каждого модуля. */
export const greenAssemblers = (): { x: number; y: number }[] =>
  Array.from({ length: MODULES }, (_, m) => ({ x: ORIGIN.x + m * MODULE_STEP + 12, y: ORIGIN.y }));

/** Ставит завод в пустое состояние, раздаёт рецепты (кроме зелёных пакетов), столбы и генераторы. */
export function buildPlant(state: SimState): void {
  const stocks: [number, number, readonly Stock[]][] = [];
  const cmds: Command[] = [];
  for (let m = 0; m < MODULES; m++) {
    const mod = module(ORIGIN.x + m * MODULE_STEP, ORIGIN.y);
    cmds.push(...mod.cmds);
    stocks.push(...mod.stocks);
  }
  // Генераторы с угольными сундуками: сундук (gx, gy+1) → манипулятор → генератор.
  const gx = ORIGIN.x + MODULES * MODULE_STEP - 2;
  for (let g = 0; g < GENERATORS; g++) {
    const gy = 1 + g * 6;
    cmds.push(build('chest', gx, gy + 1), build('inserter', gx + 1, gy + 1, E), build('generator', gx + 2, gy));
    stocks.push([gx, gy + 1, [['coal', 2]]]);
  }
  // Инвентарь: ровно столько зданий, сколько строится (стопка stocked не хватает на все манипуляторы).
  for (const c of cmds) if (c.type === 'build') give(state, c.building, 1);
  tick(state, cmds);
  for (let m = 0; m < MODULES; m++) {
    for (const r of roles(ORIGIN.x + m * MODULE_STEP, ORIGIN.y)) {
      if (!r.late) tick(state, [{ type: 'setRecipe', building: buildingAt(state, r.x, r.y)!.id, recipe: r.recipe }]);
    }
  }
  for (const [x, y, list] of stocks) {
    const sizes: Record<string, number> = { ironPlate: 100, copperPlate: 100, circuit: 200, coal: 50 };
    buildingAt(state, x, y)!.slots = list.flatMap(([item, n]) => stack(item, n, sizes[item]!));
  }
  // Затравка: манипулятору генератора нужна энергия, чтобы подвезти первый уголь.
  for (const b of Object.values(state.buildings)) if (b.type === 'generator') b.fuel = { item: 'coal', count: 5 };
  placePoles(state);
}

/**
 * Столбы: для каждого здания с энергией (кроме печей на топливе) без сети ставит столб в первую свободную клетку
 * рядом, где здание получает сеть, а все столбы остаются одной сетью. Так весь завод и генераторы — одна сеть.
 */
function placePoles(state: SimState): void {
  const poles = (): number => new Set(powerNetworks(state).poleNet.values()).size;
  for (const b of Object.values(state.buildings)) {
    const def: BuildingDef | undefined = (buildings as Record<string, BuildingDef>)[b.type];
    if (!def?.energy || def.energy.kind === 'fuel' || powerNetworks(state).buildingNet.has(b.id)) continue;
    const [w, h] = footprintSize(def.size, b.dir);
    let placed = false;
    for (let y = b.y - 2; y <= b.y + h + 1 && !placed; y++) {
      for (let x = b.x - 2; x <= b.x + w + 1 && !placed; x++) {
        if (!canPlace(state, 'pole', x, y, 0)) continue;
        give(state, 'pole', 1);
        placeBuilding(state, 'pole', x, y, 0);
        if (powerNetworks(state).buildingNet.has(b.id) && poles() === 1) placed = true;
        else demolishAt(state, x, y);
      }
    }
    if (!placed) throw new Error(`placePoles: нет места для столба у ${b.type} (${b.x}, ${b.y})`);
  }
}
