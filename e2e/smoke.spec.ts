// Дымовой тест интерфейса: настоящий браузер, WebGL, ввод мышью и клавишами.
// Строит цепочку бур -> печь -> манипулятор -> сундук на залежи железа, ждёт пластин,
// открывает окна, перезагружает страницу (сохранение/загрузка). Ошибки консоли роняют тест (fixtures.ts).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { build, buildCount, cellPoint, clickCell, openGame, tickOf } from './game';

// Клетки карты (стартовая карта: железо x 76..81, y 58..63; уголь x 61..66, y 46..51).
// Бур 2×2 смотрит на восток и выдаёт руду прямо в печь; манипулятор переносит пластины в сундук.
const DRILL = [78, 61] as const; // курсор на правой нижней клетке 2×2: якорь (77, 60)
const FURNACE = [80, 61] as const; // якорь (79, 60), стоит в клетке выдачи бура
const INSERTER = [81, 60] as const;
const CHEST = [82, 60] as const;
const POLE = [80, 62] as const; // покрытие 5×5 задевает бур, манипулятор и генератор
const GENERATOR = [80, 64] as const; // 3×3, якорь (79, 63)
const COAL_CELL = [63, 50] as const;

/** Esc дважды: первый закрывает окно, второй снимает инструмент; лишний Esc ничего не ломает. */
async function reset(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
}

/** Окно здания: клик по клетке без инструмента. */
async function openWindow(page: Page, title: string, cell: readonly [number, number]): Promise<void> {
  await reset(page);
  await clickCell(page, cell[0], cell[1]);
  await expect(page.locator('.inventory-window h2')).toHaveText(title);
}

/** Кладёт всю стопку предмета из инвентаря в открытое окно здания. */
async function putAll(page: Page, item: string): Promise<void> {
  await page.locator('.inventory-window .inv-grid button', { has: page.locator(`img[alt="${item}"]`) }).click();
}

test('цепочка бур -> печь -> манипулятор -> сундук даёт пластины, партия переживает перезагрузку', async ({ page }) => {
  await openGame(page);

  await test.step('стройка мышью по кнопкам панели', async () => {
    // R после выбора бура: направление остаётся в инструменте, остальные здания тоже смотрят на восток.
    await build(page, 'Бур', ...DRILL, true);
    await build(page, 'Печь', ...FURNACE);
    await build(page, 'Манипулятор', ...INSERTER);
    await build(page, 'Сундук', ...CHEST);
    await build(page, 'Столб', ...POLE);
    await build(page, 'Генератор', ...GENERATOR);
  });

  await test.step('печь: окно здания и топливо', async () => {
    await openWindow(page, 'Печь', FURNACE);
    await putAll(page, 'Уголь');
    await reset(page);
  });

  await test.step('кирка: добыть уголь руками и открыть инвентарь', async () => {
    await page.keyboard.press('KeyM');
    const { x, y } = cellPoint(page, ...COAL_CELL);
    await page.mouse.move(x, y);
    await page.mouse.down();
    // Одна руда за 30 тиков; считаем тики, а не секунды: без GPU игра идёт заметно медленнее 60 тиков/с.
    const start = await tickOf(page);
    await expect.poll(() => tickOf(page), { timeout: 60_000 }).toBeGreaterThanOrEqual(start + 100);
    await page.mouse.up();
    await reset(page);
    await page.keyboard.press('KeyE');
    await expect(page.locator('.inventory-window h2')).toHaveText('Инвентарь');
    await expect(page.locator('.inventory-window .inv-grid img[alt="Уголь"]')).toBeVisible();
    await reset(page);
  });

  await test.step('генератор: топливо из добытого угля', async () => {
    await openWindow(page, 'Генератор', GENERATOR);
    await putAll(page, 'Уголь');
    await reset(page);
  });

  await test.step('пластины появились в сундуке', async () => {
    await openWindow(page, 'Сундук', CHEST);
    await expect(page.locator('.inventory-window .bw-chest img[alt="Железная пластина"]')).toBeVisible({ timeout: 120_000 });
    await reset(page);
  });

  await test.step('перезагрузка: партия загружается из сохранения', async () => {
    const before = await tickOf(page);
    // Сохранение пишется на pagehide.
    await page.reload();
    await openGame(page);
    expect(await tickOf(page)).toBeGreaterThanOrEqual(before);
    await expect(buildCount(page, 'Бур')).toHaveText('1');
    await expect(buildCount(page, 'Сундук')).toHaveText('0');
    await openWindow(page, 'Сундук', CHEST);
    await expect(page.locator('.inventory-window .bw-chest img[alt="Железная пластина"]')).toBeVisible();
  });
});
