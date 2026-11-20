import { describe, expect, it } from 'vitest';
// @ts-expect-error — скрипт на чистом JS без типов
import { ownerOf, parseComponent } from './groma-fold.mjs';

const doc = (id: string, parent: string, files: string[], body = '') =>
  `---\ntype: C4 Component\ntitle: X\ngroma:\n  id: ${id}\n  parent: ${parent}\n  code:\n${files
    .map((f) => `    - scanner: typescript\n      file: ${f}\n`)
    .join('')}---\n${body}`;

describe('groma-fold (TASK-39)', () => {
  it('разбирает id, родителя, файлы и наличие описания', () => {
    expect(parseComponent(doc('fuel', 'browser-game', ['packages/sim/src/fuel.ts']))).toEqual({
      id: 'fuel',
      parent: 'browser-game',
      files: ['packages/sim/src/fuel.ts'],
      hasBody: false,
    });
    expect(parseComponent(doc('x', 'factory', ['a.ts'], '\nОписание\n')).hasBody).toBe(true);
  });

  it('владелец — компонент пакета, если все файлы в одном пакете', () => {
    expect(ownerOf(['packages/sim/src/fuel.ts', 'packages/sim/src/testKit.ts'])).toBe('sim');
    expect(ownerOf(['packages/app/src/demo.ts'])).toBe('ui');
    expect(ownerOf(['packages/sim/src/a.ts', 'packages/save/src/b.ts'])).toBeUndefined();
    expect(ownerOf(['tools/x.ts'])).toBeUndefined();
  });
});
