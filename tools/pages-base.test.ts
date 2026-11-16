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
  });

  it('берётся из BASE_PATH', async () => {
    process.env.BASE_PATH = '/factory/';
    expect(await loadBase()).toBe('/factory/');
  });
});
