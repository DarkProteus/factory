// Проверка самой проверки: ошибка в консоли страницы должна ронять тест (fixtures.ts).
// test.fail() считает тест пройденным, только если он упал.
import { test } from './fixtures';

test('console.error роняет тест', async ({ page }) => {
  test.fail();
  await page.goto('about:blank');
  await page.evaluate(() => console.error('ошибка для проверки'));
});

test('необработанное исключение страницы роняет тест', async ({ page }) => {
  test.fail();
  await page.goto('about:blank');
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error('исключение для проверки');
    }, 0);
  });
  await page.waitForTimeout(200);
});
