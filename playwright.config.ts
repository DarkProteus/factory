import { defineConfig } from '@playwright/test';

/** Порт dev-сервера для e2e: не 5173, чтобы не столкнуться с запущенным `pnpm dev`. */
const PORT = 5199;

export default defineConfig({
  testDir: 'e2e',
  // Сценарий идёт в реальном времени (тики 60/с): параллелить нечего.
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1280, height: 900 },
    // WebGL в headless-Chromium без GPU: программный растеризатор SwiftShader.
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `pnpm --filter @factory/app exec vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
