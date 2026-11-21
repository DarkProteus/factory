import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadBase() {
  vi.resetModules();
  const { default: config } = await import('../packages/app/vite.config.ts');
  return config.base;
}

describe('базовый путь сборки для GitHub Pages', () => {
  afterEach(() => {
    delete process.env.BASE_PATH;
  });

  it('по умолчанию корень', async () => {
    expect(await loadBase()).toBe('/');
    // Холодный импорт vite.config (vite целиком): ~1 с в покое, под нагрузкой выходит за 5 с (TASK-65).
  }, 30_000);

  it('берётся из BASE_PATH', async () => {
    process.env.BASE_PATH = '/factory/';
    expect(await loadBase()).toBe('/factory/');
  });
});
