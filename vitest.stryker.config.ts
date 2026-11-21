// Конфиг vitest только для Stryker: тесты sim без бенча (бенч долгий и мерит время, а не поведение).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/sim/src/**/*.test.ts'],
    // Медленные интеграционные тесты (каждый 4-13 с) исключены: Stryker гонял бы их на каждого мутанта,
    // полный прогон растянулся бы на часы. Остальные тесты покрывают те же модули по отдельности.
    exclude: [
      '**/*.bench.test.ts',
      '**/node_modules/**',
      '**/milestone2.test.ts',
      '**/milestone3.test.ts',
      '**/smelting.test.ts',
    ],
  },
});
