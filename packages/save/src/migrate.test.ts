import { describe, expect, it } from 'vitest';
import { technologies } from '@factory/content';
import { createState, hash, tick, type SimState } from '@factory/sim';
import { deserialize, SAVE_VERSION, SaveError, serialize } from './index';
import fixtureM2 from './fixtures/save-m2.json';

const m2Text = () => JSON.stringify(fixtureM2);
const techId = Object.keys(technologies)[0]!;
const tech = technologies[techId as keyof typeof technologies];

describe('миграция сейва M2 (версия 3) в M3', () => {
  it('версия формата поднята до 4', () => {
    expect(SAVE_VERSION).toBe(4);
    expect(fixtureM2.version).toBe(3);
    expect('research' in fixtureM2.state).toBe(false);
  });

  it('здания и инвентарь на месте, исследования пустые', () => {
    const state = deserialize(m2Text());
    expect(Object.keys(state.buildings).length).toBe(Object.keys(fixtureM2.state.buildings).length);
    expect(state.buildings).toEqual(fixtureM2.state.buildings);
    expect(state.inventory).toEqual(fixtureM2.state.inventory);
    expect(state.tick).toBe(fixtureM2.state.tick);
    // Разделитель и подземный конвейер остаются, хотя технология не изучена.
    expect(Object.values(state.buildings).some((b) => b.type === 'filterSplitter' && b.filter === 'coal')).toBe(true);
    expect(Object.values(state.buildings).some((b) => b.underground === 'in')).toBe(true);
    expect(state.research).toEqual(createState(1).research);
    expect(state.research.active).toBeNull();
    expect(state.research.done).toEqual([]);
    expect(state.research.progress).toEqual({});
    expect(state.events).toEqual([]);
  });

  it('после загрузки тики идут, события очищаются', () => {
    const state = deserialize(m2Text());
    const t0 = state.tick;
    for (let i = 0; i < 200; i++) tick(state, []);
    expect(state.tick).toBe(t0 + 200);
    expect(state.research.unlocked.length).toBeGreaterThan(0);
  });

  it('перезапись мигрированного состояния даёт версию 4 и тот же хеш', () => {
    const state = deserialize(m2Text());
    const file = JSON.parse(serialize(state)) as { version: number };
    expect(file.version).toBe(4);
    expect(hash(deserialize(serialize(state)))).toBe(hash(state));
  });

  it('версии старше 3 по-прежнему отвергаются', () => {
    for (const version of [1, 2]) {
      const text = JSON.stringify({ ...fixtureM2, version });
      expect(() => deserialize(text)).toThrow(/устарело: версия \d/);
    }
  });

  it('версия 3 с битым состоянием отвергается, а не падает', () => {
    const text = JSON.stringify({ version: 3, state: { ...fixtureM2.state, buildings: 5 } });
    expect(() => deserialize(text)).toThrow(SaveError);
  });
});

describe('сейв M3 с исследованиями', () => {
  function researched(): SimState {
    const s = createState(5, { width: 8, height: 8 });
    s.research.active = techId as never;
    s.research.progress = { [techId]: { units: Math.max(0, tech.units - 1), ticks: 3 } } as never;
    return s;
  }

  it('round-trip: прогресс, открытые рецепты и хеш совпадают', () => {
    const s = researched();
    const back = deserialize(serialize(s));
    expect(back.research).toEqual(s.research);
    expect(hash(back)).toBe(hash(s));
  });

  it('events при загрузке отбрасываются', () => {
    const s = researched();
    s.events.push({ type: 'researchDone', tech: techId as never });
    expect(deserialize(serialize(s)).events).toEqual([]);
  });

  it('изученная технология сохраняется', () => {
    const s = researched();
    s.research.done = [techId as never];
    s.research.progress = {};
    expect(deserialize(serialize(s)).research.done).toEqual([techId]);
  });
});

describe('валидация research', () => {
  const edit = (f: (r: Record<string, any>, st: Record<string, any>) => void): string => {
    const file = JSON.parse(serialize(createState(1, { width: 8, height: 8 })));
    f(file.state.research, file.state);
    return JSON.stringify(file);
  };
  const bad = (f: (r: Record<string, any>, st: Record<string, any>) => void, re: RegExp) =>
    expect(() => deserialize(edit(f))).toThrow(re);

  it('форма и ссылки', () => {
    bad((_r, st) => delete st.research, /research|исследовани/);
    bad((_r, st) => (st.research = 5), /исследовани/);
    bad((r) => (r.active = 'nope'), /технолог/);
    bad((r) => (r.active = 7), /технолог/);
    bad((r) => (r.progress = { nope: { units: 0, ticks: 0 } }), /технолог/);
    bad((r) => (r.progress = { [techId]: { units: 0.5, ticks: 0 } }), /units/);
    bad((r) => (r.progress = { [techId]: { units: tech.units + 1, ticks: 0 } }), /units/);
    bad((r) => (r.progress = { [techId]: { units: 0, ticks: -1 } }), /ticks/);
    bad((r) => (r.unlocked = ['nope']), /рецепт/);
    bad((r) => (r.unlocked = 'x'), /unlocked/);
    bad((r) => (r.done = ['nope']), /технолог/);
    bad((r) => (r.done = [techId, techId]), /повтор/);
  });

  it('events должен быть массивом', () => {
    bad((_r, st) => delete st.events, /events/);
    bad((_r, st) => (st.events = {}), /events/);
  });

  it('корректные значения принимаются', () => {
    expect(() => deserialize(edit((r) => (r.active = techId)))).not.toThrow();
  });

});
