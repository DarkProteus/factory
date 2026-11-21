// Общий test для e2e: любая ошибка в консоли страницы (console.error, pageerror) роняет тест.
import { expect, test as base } from '@playwright/test';

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
      });
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      await use(errors);
      expect(errors, 'ошибки в консоли страницы').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
