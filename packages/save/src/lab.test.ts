import { describe, expect, it } from 'vitest';
import { buildingAt, createState, hash, tick, type SimState } from '@factory/sim';
import { deserialize, serialize } from './index';

/** Лаборатория (2,2) с пакетами в ячейке и идущей единицей «Логистики» (TASK-59). */
function withLab(): SimState {
  const s = createState(1, { width: 16, height: 16 });
  s.inventory.push({ item: 'lab', count: 1 });
  tick(s, [{ type: 'build', building: 'lab', x: 2, y: 2, dir: 0 }]);
  const lab = buildingAt(s, 2, 2)!;
  lab.input = [{ item: 'sciencePackRed', count: 5 }];
  lab.unit = 'logistics';
  lab.progress = 120;
  return s;
}

describe('лаборатория в сохранении', () => {
  it('ячейки пакетов и идущая единица переживают сохранение', () => {
    const s = withLab();
    const back = deserialize(serialize(s));
    expect(buildingAt(back, 2, 2)!.unit).toBe('logistics');
    expect(hash(back)).toBe(hash(s));
  });

  it('неизвестная технология в unit отвергается', () => {
    const text = serialize(withLab()).replace('"unit":"logistics"', '"unit":"warp"');
    expect(() => deserialize(text)).toThrow();
  });
});
