import { recipes, technologies } from '@factory/content';
import { SaveError } from './errors';

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function fail(where: string, what: string): never {
  throw new SaveError(`Сохранение повреждено: ${where} — ${what}.`);
}

function checkTech(id: unknown, where: string): void {
  if (typeof id !== 'string' || !Object.hasOwn(technologies, id)) {
    throw new SaveError(`В сохранении есть технология «${String(id)}», которой нет в игре (${where}).`);
  }
}

/** Проверяет форму исследований: ссылки на технологии и рецепты, границы прогресса. */
export function checkResearch(research: unknown): void {
  if (!isObject(research)) fail('исследования', 'ожидался объект');
  if (research.active !== null) checkTech(research.active, 'исследования.active');

  if (!isObject(research.progress)) fail('исследования.progress', 'ожидался объект');
  for (const [id, p] of Object.entries(research.progress)) {
    const where = `исследования.progress.${id}`;
    checkTech(id, where);
    if (!isObject(p)) fail(where, 'ожидался объект');
    const max = technologies[id as keyof typeof technologies].units;
    if (!Number.isInteger(p.units) || (p.units as number) < 0 || (p.units as number) > max) {
      fail(where, `неверное поле units (0..${max})`);
    }
    if (!Number.isFinite(p.ticks) || (p.ticks as number) < 0) fail(where, 'неверное поле ticks');
  }

  if (!Array.isArray(research.unlocked)) fail('исследования.unlocked', 'ожидался список');
  for (const r of research.unlocked) {
    if (typeof r !== 'string' || !Object.hasOwn(recipes, r)) {
      throw new SaveError(`В сохранении есть рецепт «${String(r)}», которого нет в игре (исследования.unlocked).`);
    }
  }

  if (!Array.isArray(research.done)) fail('исследования.done', 'ожидался список');
  const seen = new Set<string>();
  for (const id of research.done) {
    checkTech(id, 'исследования.done');
    if (seen.has(id as string)) fail('исследования.done', `повтор технологии «${String(id)}»`);
    seen.add(id as string);
  }
}
