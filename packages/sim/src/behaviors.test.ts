import { describe, expect, it } from 'vitest';
import { runBehaviors } from './behaviors';
import { createState } from './index';

describe('runBehaviors', () => {
  it('здание с неизвестным типом (нет в таблице) пропускается без ошибки и без изменений', () => {
    const state = createState(1);
    state.buildings[1] = { id: 1, type: 'unknownThing', x: 0, y: 0, dir: 1, progress: 0, output: null };
    state.nextId = 2;
    expect(() => runBehaviors(state)).not.toThrow();
    expect(state.buildings[1]).toEqual({ id: 1, type: 'unknownThing', x: 0, y: 0, dir: 1, progress: 0, output: null });
  });
});
