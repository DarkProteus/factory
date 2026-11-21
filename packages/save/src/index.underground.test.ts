import { describe, expect, it } from 'vitest';
import { buildingAt, createState, hash, tick, type SimState } from '@factory/sim';
import { deserialize, serialize } from './index';

/** Кладёт в инвентарь подземные конвейеры для постройки. */
function withUnderground(s: SimState): SimState {
  s.inventory.push({ item: 'undergroundBelt', count: 10 });
  return s;
}

describe('подземный конвейер в сохранении (TASK-36)', () => {
  it('роль подземного и предметы тоннеля переживают сохранение', () => {
    const s = withUnderground(createState(1, { width: 16, height: 16 }));
    tick(s, [
      { type: 'build', building: 'undergroundBelt', x: 3, y: 5, dir: 1 },
      { type: 'build', building: 'undergroundBelt', x: 7, y: 5, dir: 1 },
    ]);
    buildingAt(s, 3, 5)!.belt = [{ item: 'coal', pos: 600 }];
    const back = deserialize(serialize(s));
    expect(buildingAt(back, 7, 5)!.underground).toBe('out');
    expect(hash(back)).toBe(hash(s));
  });

  it('неверная роль подземного отвергается', () => {
    const s = withUnderground(createState(1, { width: 16, height: 16 }));
    tick(s, [{ type: 'build', building: 'undergroundBelt', x: 3, y: 5, dir: 1 }]);
    const text = serialize(s).replace('"underground":"in"', '"underground":"up"');
    expect(() => deserialize(text)).toThrow();
  });
});
