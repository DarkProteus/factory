// Таблица «здание × здание» (TASK-71): пары берутся из content, ожидания — из pairsTable.testkit.ts.
// Новое здание без строки в таблицах роняет тест: нельзя добавить, не решив, как оно сочетается с остальными.
import { buildings, type BuildingDef } from '@factory/content';
import { describe, expect, it } from 'vitest';
import { applyCommand, buildingAt, createState, pushToBelt, tick, type PlacedBuilding, type SimState } from './index';
import { GIVES, lookup, MANIP_PUTS, MANIP_TAKES, NO_BUILDING_YET, type PlayableBehavior } from './pairsTable.testkit';
import { electrify, stocked } from './testKit';

type Defs = Readonly<Record<string, BuildingDef>>;
const defsOf = buildings as Defs;
const ids = Object.keys(buildings);
const behaviorOf = (id: string): PlayableBehavior => defsOf[id]!.behavior as PlayableBehavior;

/** Недостающие строки: по одной на каждое здание из defs и каждую таблицу, где его нет. Пусто — таблицы полны. */
function missingRows(defs: Defs): string[] {
  const out = new Set<string>();
  for (const [id, def] of Object.entries(defs)) {
    const hint = (table: string): string => `добавьте строку для ${id} (${def.behavior}) в ${table}`;
    if (lookup(MANIP_TAKES, id, def.behavior) === undefined) out.add(hint('MANIP_TAKES'));
    if (lookup(MANIP_PUTS, id, def.behavior) === undefined) out.add(hint('MANIP_PUTS'));
    if (!Object.hasOwn(GIVES, def.behavior)) out.add(hint('GIVES'));
    for (const giver of Object.values(GIVES)) {
      if (giver !== 'none' && lookup(giver, id, def.behavior) === undefined) out.add(hint('GIVES (цели)'));
    }
  }
  return [...out];
}

/** Ожидание для пары; нет строки — понятная ошибка вместо молчаливого undefined. */
function expected(rule: Parameters<typeof lookup>[0], table: string, id: string, defs: Defs = defsOf): boolean {
  const value = lookup(rule, id, defs[id]!.behavior);
  if (value === undefined) throw new Error(`добавьте строку для ${id} (${defs[id]!.behavior}) в ${table}`);
  return value;
}

/** Ставит здание командой build; (x, y) — левый верхний угол, направление 1 (на восток). */
function place(state: SimState, building: string, x: number, y: number): PlacedBuilding {
  applyCommand(state, { type: 'build', building, x, y, dir: 1 });
  const b = buildingAt(state, x, y);
  if (!b || b.type !== building) throw new Error(`не удалось поставить ${building} в (${x}, ${y})`);
  return b;
}

/** Подготовка цели и подходящий ей предмет: печи — руда, сборщику — ингредиент рецепта, лаборатории — пакет активной технологии. */
function prepareTarget(state: SimState, b: PlacedBuilding): string {
  switch (behaviorOf(b.type)) {
    case 'crafter':
      if (defsOf[b.type]!.recipeMode !== 'chosen') return 'ironOre';
      applyCommand(state, { type: 'setRecipe', building: b.id, recipe: 'ironGear' });
      return 'ironPlate';
    case 'lab':
      state.research.active = 'logistics';
      return 'sciencePackRed';
    case 'generator':
      return 'coal';
    default:
      return 'ironOre';
  }
}

/** Кладёт предмет туда, откуда его берёт манипулятор (или откуда отдаёт здание): три штуки, где есть счётчик. */
function fillSource(b: PlacedBuilding, item: string): void {
  const stack = { item, count: 3 };
  switch (behaviorOf(b.type)) {
    case 'belt':
    case 'underground':
      pushToBelt(b, item);
      break;
    case 'splitter':
    case 'filterSplitter':
      b.belt = [{ item, pos: 4 }];
      break;
    case 'miner':
    case 'crafter':
      b.output = stack;
      break;
    case 'inserter':
      b.output = { item, count: 1 };
      break;
    case 'generator':
      b.fuel = stack;
      break;
    case 'lab':
      b.input = [stack];
      break;
    case 'container':
      b.slots = [stack];
      break;
    case 'pole':
      break;
  }
}

/** Источник слева, цель в (12, 12), между ними `gap` клеток (1 — манипулятор, 0 — вплотную). Все здания квадратные. */
function world(source: string, target: string, gap: number): { state: SimState; src: PlacedBuilding; tgt: PlacedBuilding; mid?: PlacedBuilding } {
  const state = stocked(createState(1, { width: 24, height: 24 }));
  const src = place(state, source, 12 - gap - defsOf[source]!.size[0], 12);
  const mid = gap > 0 ? place(state, 'inserter', 12 - gap, 12) : undefined;
  const tgt = place(state, target, 12, 12);
  return { state, src, tgt, mid };
}

/** Прогоняет мир и сообщает, переложил ли манипулятор предмет: рука заполнилась и опустела. */
function inserterMoved(state: SimState, hand: PlacedBuilding, ticks = 80): boolean {
  let picked = false;
  for (let i = 0; i < ticks; i++) {
    tick(state, []);
    if (hand.output) picked = true;
    else if (picked) return true;
  }
  return false;
}

// rule: building-combos
describe('таблица «здание × здание»: полнота', () => {
  it('для каждого здания content есть строки во всех таблицах', () => {
    expect(missingRows(defsOf)).toEqual([]);
  });

  it('поведения-заготовки без здания в content пропускаются явно', () => {
    const used = ids.filter((id) => (NO_BUILDING_YET as readonly string[]).includes(defsOf[id]!.behavior));
    expect(used, 'появилось здание-заготовка: добавьте для него строки в таблицы и уберите из NO_BUILDING_YET').toEqual([]);
  });

  it('новое здание без строки роняет тест с понятным сообщением', () => {
    const fake = { ...defsOf.chest!, behavior: 'hologram' } as unknown as BuildingDef;
    const withFake = { ...defsOf, hologramBox: fake };
    const messages = missingRows(withFake);
    expect(messages).toContain('добавьте строку для hologramBox (hologram) в MANIP_TAKES');
    expect(messages).toContain('добавьте строку для hologramBox (hologram) в MANIP_PUTS');
    expect(messages).toContain('добавьте строку для hologramBox (hologram) в GIVES');
    expect(messages).toContain('добавьте строку для hologramBox (hologram) в GIVES (цели)');
    // Пара с таким зданием падает сразу: ожидание не берётся из воздуха.
    expect(() => expected(MANIP_PUTS, 'MANIP_PUTS', 'hologramBox', withFake)).toThrow('добавьте строку для hologramBox (hologram)');
    // Известное поведение под новым id строки не требует: достаточно behavior.
    expect(missingRows({ ...defsOf, chest2: defsOf.chest! })).toEqual([]);
  });
});

describe('манипулятор: источник → цель', () => {
  for (const source of ids) {
    for (const target of ids) {
      it(`${source} → ${target}`, () => {
        const want = expected(MANIP_TAKES, 'MANIP_TAKES', source) && expected(MANIP_PUTS, 'MANIP_PUTS', target);
        const { state, src, tgt, mid } = world(source, target, 1);
        fillSource(src, prepareTarget(state, tgt));
        electrify(state);
        expect(inserterMoved(state, mid!)).toBe(want);
      });
    }
  }

  it('из крафтера не берётся вход и топливо, только выход', () => {
    for (const id of ids.filter((x) => behaviorOf(x) === 'crafter')) {
      const { state, src, mid } = world(id, 'chest', 1);
      src.input = [{ item: 'ironOre', count: 3 }];
      src.fuel = { item: 'coal', count: 3 };
      electrify(state);
      expect(inserterMoved(state, mid!), id).toBe(false);
    }
  });
});

describe('лента, разделитель и бур отдают сами: источник → цель', () => {
  const givers = ids.filter((id) => GIVES[behaviorOf(id)] !== 'none');
  const held = (b: PlacedBuilding): number => (b.output?.count ?? 0) + (b.belt?.length ?? 0);
  for (const source of givers) {
    for (const target of ids) {
      it(`${source} → ${target}`, () => {
        const row = GIVES[behaviorOf(source)];
        const want = expected(row === 'none' ? undefined : row, 'GIVES', target);
        const { state, src, tgt } = world(source, target, 0);
        fillSource(src, prepareTarget(state, tgt));
        const before = held(src);
        for (let i = 0; i < 60; i++) tick(state, []);
        expect(held(src) < before).toBe(want);
      });
    }
  }
});
