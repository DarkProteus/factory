import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const eslint = new ESLint({ cwd: root });

async function errorsFor(code: string, file = 'packages/sim/src/probe.ts') {
  const [result] = await eslint.lintText(code, { filePath: resolve(root, file) });
  return result?.messages.filter((m) => m.severity === 2) ?? [];
}

describe('границы пакета sim', () => {
  it.each([
    "import '@factory/render';",
    "import '@factory/app';",
    "import { x } from '@factory/render/src/x';",
    "import { x } from '../../render/src/index';",
    "import { x } from '../../app/src/main';",
    "export * from '@factory/app';",
  ])('запрещает %s', async (code) => {
    const errors = await errorsFor(code);
    expect(errors.map((e) => e.ruleId)).toContain('no-restricted-imports');
  });

  it('разрешает импорт content', async () => {
    expect(await errorsFor("import '@factory/content';")).toEqual([]);
  });

  it('не ограничивает другие пакеты', async () => {
    expect(await errorsFor("import '@factory/render';", 'packages/app/src/probe.ts')).toEqual([]);
  });

  it('настоящий код sim проходит линтер', async () => {
    const results = await eslint.lintFiles(['packages/sim']);
    expect(results.length).toBeGreaterThan(0);
    expect(results.flatMap((r) => r.messages)).toEqual([]);
    // Линтер всего sim под нагрузкой идёт дольше стандартных 5 с (TASK-60).
  }, 30_000);
});
