// Помощники e2e: открытие игры, камера, клик по клетке карты, панель стройки.
import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';

/** Размер клетки при зуме 1 (render: CELL). */
const CELL = 32;
/** Камера новой партии стоит в центре клетки (64, 64) стартовой карты 128×128 при зуме 1.5 (app/game.ts). */
const CENTER = 64;
const START_ZOOM = 1.5;
/** Шаг колеса — множитель 1.15 (render/camera.ts: ZOOM_STEP); колесо вниз отдаляет. */
const ZOOM_STEP = 1.15;
const WHEEL_STEPS = 4;
const ZOOM = START_ZOOM / ZOOM_STEP ** WHEEL_STEPS;

/** Номер тика из угла экрана («ТИК 123»). */
export async function tickOf(page: Page): Promise<number> {
  const text = (await page.locator('.tick').textContent()) ?? '';
  return Number(/\d+/.exec(text)?.[0] ?? 0);
}

/**
 * Отдаляет камеру колесом у центра экрана: точка под курсором остаётся на месте, поэтому
 * камера остаётся в центре карты, а зум известен точно (1.5 / 1.15^шагов). Так залежи вокруг
 * центра видны без перетаскивания, а координаты клеток считаются из камеры.
 */
export async function zoomOut(page: Page): Promise<void> {
  const { width, height } = page.viewportSize()!;
  await page.mouse.move(width / 2, height / 2);
  for (let i = 0; i < WHEEL_STEPS; i++) await page.mouse.wheel(0, 100);
}

/** Открывает игру, ждёт канвас, панель и тики, затем отдаляет камеру. */
export async function openGame(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.dock')).toBeVisible();
  await expect.poll(() => tickOf(page)).toBeGreaterThan(0);
  await zoomOut(page);
}

/** Экранная точка центра клетки карты; считается из камеры после zoomOut. */
export function cellPoint(page: Page, cx: number, cy: number): { x: number; y: number } {
  const { width, height } = page.viewportSize()!;
  const px = CELL * ZOOM;
  return { x: width / 2 + (cx - CENTER) * px, y: height / 2 + (cy - CENTER) * px };
}

export async function clickCell(page: Page, cx: number, cy: number): Promise<void> {
  const { x, y } = cellPoint(page, cx, cy);
  await page.mouse.click(x, y);
}

/** Кнопка здания на панели стройки по его названию (alt иконки). */
export function buildButton(page: Page, name: string): Locator {
  return page.locator('.dock button.btn', { has: page.locator(`img[alt="${name}"]`) });
}

/** Счётчик экземпляров здания на его кнопке. */
export function buildCount(page: Page, name: string): Locator {
  return buildButton(page, name).locator('.count');
}

/**
 * Выбирает здание кнопкой и ставит его кликом по клетке; ждёт, пока счётчик уменьшится.
 * `rotate` — нажать R после выбора: направление остаётся в инструменте для следующих зданий.
 */
export async function build(page: Page, name: string, cx: number, cy: number, rotate = false): Promise<void> {
  const count = buildCount(page, name);
  const before = Number(await count.textContent());
  await buildButton(page, name).click();
  if (rotate) await page.keyboard.press('KeyR');
  await clickCell(page, cx, cy);
  await expect(count).toHaveText(String(before - 1));
}
