import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // По умолчанию vitest подменяет CSS пустой строкой; тема нужна тесту как текст (?raw).
    css: { include: [/theme\.css/] },
    include: ['packages/*/src/**/*.test.{ts,tsx}', 'tools/**/*.test.ts'],
  },
});
