import { describe, expect, it } from 'vitest';
import { createState, hash, runTicks, tick } from '@factory/sim';
import { deserialize, SAVE_VERSION, SaveError, serialize } from './index';
import { all, factory, LATER, roundtrip } from './index.testkit';

describe('сохранение завода', () => {
  it('в проверяемом состоянии есть предметы на конвейерах, в буферах, печи и сундуке', () => {
    const state = factory();
    const b = all(state);
    expect(b.some((x) => x.type === 'belt' && (x.belt?.length ?? 0) > 0)).toBe(true);
    expect(b.some((x) => x.type === 'drill' && x.output)).toBe(true);
    expect(b.some((x) => x.type === 'furnace' && (x.input?.length || x.output || x.progress > 0))).toBe(true);
    // Топливо в ячейке печи и остаток энергии сгоревшего угля.
    expect(b.some((x) => x.type === 'furnace' && x.fuel && x.burn)).toBe(true);
    expect(b.some((x) => x.type === 'chest' && x.slots?.length)).toBe(true);
    expect(state.inventory.length).toBe(2);
    expect(state.map.deposits[0]?.item).toBe('ironOre');
  });

  it('состояние после загрузки равно исходному, включая карту и инвентарь', () => {
    const state = factory();
    const loaded = roundtrip(state);
    expect(loaded).toEqual(state);
    expect(loaded.map.deposits[0]).toEqual({ item: 'ironOre', amount: expect.any(Number), initial: 5000 });
    expect(loaded.inventory).toEqual(state.inventory);
  });

  it('хеш после сохранения и загрузки совпадает, в том числе для пустого состояния', () => {
    const state = factory();
    expect(hash(roundtrip(state))).toBe(hash(state));
    const empty = createState(99);
    expect(hash(roundtrip(empty))).toBe(hash(empty));
  });

  it('сохранение не меняет исходное состояние', () => {
    const state = factory();
    const before = hash(state);
    serialize(state);
    expect(hash(state)).toBe(before);
  });

  it('загруженная и исходная партии через 1000 тиков с теми же командами дают один хеш', () => {
    const original = factory();
    const loaded = roundtrip(original);
    runTicks(original, LATER, 1000);
    runTicks(loaded, LATER, 1000);
    expect(loaded.tick).toBe(1400);
    expect(Object.keys(original.counters)).toContain('roll');
    expect(hash(loaded)).toBe(hash(original));
    expect(loaded.rng).toBe(original.rng);
  });
});

describe('версия формата', () => {
  it('сохранение содержит номер версии', () => {
    const file = JSON.parse(serialize(createState(1))) as { version: number };
    expect(file.version).toBe(SAVE_VERSION);
  });

  it('неизвестная версия даёт понятную ошибку', () => {
    const text = JSON.stringify({ version: SAVE_VERSION + 1, state: createState(1) });
    expect(() => deserialize(text)).toThrow(SaveError);
    expect(() => deserialize(text)).toThrow(new RegExp(`Неизвестная версия сохранения: ${SAVE_VERSION + 1}`));
  });

  it('сохранения старых версий не мигрируются: понятная ошибка', () => {
    const file = JSON.parse(serialize(factory()));
    for (const version of [1, 2]) {
      file.version = version;
      expect(() => deserialize(JSON.stringify(file))).toThrow(SaveError);
      expect(() => deserialize(JSON.stringify(file))).toThrow(/устарело: версия \d/);
    }
  });

  it('нет номера версии', () => {
    expect(() => deserialize('{"state":{}}')).toThrow(/номер версии/);
  });
});
