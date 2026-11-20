import { applyCommand, createState, POWER_SCALE, tick, type SimState } from '@factory/sim';
import { describe, expect, it } from 'vitest';
import { NO_TOOL, overlayFor, type ToolState } from './input';
import { netRows, netSummaryAt } from './powerSummary';

const idle: ToolState = { tool: NO_TOOL, dir: 0 };

/** Мир: столб в (3,3), генератор в (0,0), бур с залежью в (4,4), сундук в (10,10); манипулятор в (20,20) вне сети. */
function world() {
  const state = createState(1, { width: 32, height: 32, deposits: [{ x: 4, y: 4, item: 'ironOre', amount: 99 }] });
  const place = (building: string, x: number, y: number) => {
    state.inventory.push({ item: building, count: 1 });
    applyCommand(state, { type: 'build', building, x, y, dir: 0 });
    return Object.values(state.buildings).find((b) => b.type === building)!;
  };
  const gen = place('generator', 0, 0);
  place('pole', 3, 3);
  place('drill', 4, 4);
  place('chest', 10, 10);
  place('inserter', 20, 20);
  return { state, gen };
}
const run = (state: SimState, n: number) => {
  for (let i = 0; i < n; i++) tick(state, []);
};

describe('строки сводки', () => {
  it('выработка — отдано сейчас из мощности, спрос в кВт', () => {
    expect(netRows(900, 307, POWER_SCALE)).toEqual([
      { label: 'ВЫРАБОТКА', value: '307 / 900 кВт' },
      { label: 'СПРОС', value: '307 кВт' },
    ]);
  });

  it('при нехватке добавляется строка с удовлетворённостью в процентах, не выше 99', () => {
    const rows = netRows(64, 100, Math.floor(POWER_SCALE * 0.64));
    expect(rows[0]).toEqual({ label: 'ВЫРАБОТКА', value: '64 / 64 кВт' });
    expect(rows[2]).toEqual({ label: 'НЕХВАТКА', value: '64 %', bad: true });
    expect(netRows(99, 100, POWER_SCALE - 1)[2]?.value).toBe('99 %');
  });

  it('без спроса нехватки нет', () => {
    expect(netRows(0, 0, 0)).toHaveLength(2);
  });
});

describe('сводка под курсором', () => {
  it('над столбом и зданием сети — выработка и спрос последнего тика', () => {
    const { state, gen } = world();
    gen.fuel = { item: 'coal', count: 5 };
    run(state, 3);
    const expected = { title: 'СЕТЬ', rows: [{ label: 'ВЫРАБОТКА', value: '90 / 900 кВт' }, { label: 'СПРОС', value: '90 кВт' }] };
    expect(netSummaryAt(state, idle, { x: 3, y: 3 })).toEqual(expected);
    expect(netSummaryAt(state, idle, { x: 4, y: 4 })).toEqual(expected);
    expect(netSummaryAt(state, idle, { x: 1, y: 1 })).toEqual(expected);
  });

  it('без топлива в генераторе — нехватка 0 %', () => {
    const { state } = world();
    run(state, 3);
    const rows = netSummaryAt(state, idle, { x: 3, y: 3 })!.rows;
    expect(rows.at(-1)).toEqual({ label: 'НЕХВАТКА', value: '0 %', bad: true });
  });

  it('здание с энергией вне сети — одна строка «НЕТ СЕТИ»', () => {
    const { state } = world();
    run(state, 2);
    expect(netSummaryAt(state, idle, { x: 20, y: 20 })).toEqual({ title: null, rows: [{ label: 'НЕТ СЕТИ', bad: true }] });
  });

  it('над зданием без энергии, пустой клеткой и вне карты — нет сводки', () => {
    const { state } = world();
    run(state, 2);
    expect(netSummaryAt(state, idle, { x: 10, y: 10 })).toBeNull();
    expect(netSummaryAt(state, idle, { x: 15, y: 15 })).toBeNull();
    expect(netSummaryAt(state, idle, { x: -1, y: 0 })).toBeNull();
    expect(netSummaryAt(state, idle, null)).toBeNull();
  });

  it('в режимах стройки и сноса сводки нет, кирка её не отменяет', () => {
    const { state } = world();
    run(state, 2);
    const at = { x: 3, y: 3 };
    expect(netSummaryAt(state, { tool: { kind: 'build', building: 'pole' }, dir: 0 }, at)).toBeNull();
    expect(netSummaryAt(state, { tool: { kind: 'demolish' }, dir: 0 }, at)).toBeNull();
    expect(netSummaryAt(state, { tool: { kind: 'mine' }, dir: 0 }, at)).not.toBeNull();
  });
});

describe('зоны столбов в оверлее', () => {
  const tool = (building: string): ToolState => ({ tool: { kind: 'build', building }, dir: 0 });
  it('показываются при стройке столба, генератора и электрических зданий', () => {
    const { state } = world();
    for (const b of ['pole', 'generator', 'drill', 'inserter', 'assembler']) {
      expect(overlayFor(state, tool(b), { x: 8, y: 8 })?.zones, b).toBe(true);
    }
  });

  it('не показываются при стройке прочего, сносе и без инструмента', () => {
    const { state } = world();
    for (const b of ['belt', 'chest', 'furnace', 'splitter']) {
      expect(overlayFor(state, tool(b), { x: 8, y: 8 })?.zones, b).toBeFalsy();
    }
    expect(overlayFor(state, idle, { x: 8, y: 8 })?.zones).toBeFalsy();
  });
});
