// Сохранение партии в хранилище вида localStorage. Без DOM: хранилище передаётся
// параметром (null — localStorage недоступен), поэтому всё проверяется фейковым объектом.
import { deserialize, SaveError, serialize } from '@factory/save';
import type { SimState } from '@factory/sim';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'factory.save';
/** Сюда переезжает сохранение, которое не удалось прочитать, чтобы его не затёрло новое. */
export const BROKEN_KEY = 'factory.save.broken';
/** Автосохранение раз в 30 с игрового времени (60 тиков в секунду). */
export const SAVE_INTERVAL_TICKS = 1800;

export interface LoadResult {
  state: SimState;
  /** Сообщение для игрока; null, если всё прошло гладко. */
  error: string | null;
}

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Стартовое состояние: сохранение, если оно есть и читается, иначе createFresh(). */
export function loadGame(storage: KeyValueStorage | null, createFresh: () => SimState): LoadResult {
  if (!storage) {
    return { state: createFresh(), error: 'Сохранение не загрузилось: localStorage недоступен. Начата новая партия.' };
  }
  let text: string | null;
  try {
    text = storage.getItem(SAVE_KEY);
  } catch (e) {
    return { state: createFresh(), error: `Сохранение не загрузилось: ${reason(e)}. Начата новая партия.` };
  }
  if (text === null) return { state: createFresh(), error: null };
  try {
    return { state: deserialize(text), error: null };
  } catch (e) {
    if (!(e instanceof SaveError)) throw e;
    try {
      storage.setItem(BROKEN_KEY, text);
      storage.removeItem(SAVE_KEY);
    } catch {
      // Не удалось перенести: хуже всего, что сохранение затрётся. Игра всё равно стартует.
    }
    return { state: createFresh(), error: `${e.message} Начата новая партия.` };
  }
}

/** Записывает партию. Возвращает текст ошибки или null; исключения наружу не выходят. */
export function saveGame(storage: KeyValueStorage | null, state: SimState): string | null {
  try {
    if (!storage) throw new Error('localStorage недоступен');
    storage.setItem(SAVE_KEY, serialize(state));
    return null;
  } catch (e) {
    return `Не удалось сохранить партию: ${reason(e)}.`;
  }
}

export function clearSave(storage: KeyValueStorage | null): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // Нечего делать: хранилище недоступно.
  }
}

/** Пора ли автосохраняться: с прошлого сохранения прошло не меньше интервала. */
export function shouldAutosave(currentTick: number, lastSavedTick: number): boolean {
  return currentTick - lastSavedTick >= SAVE_INTERVAL_TICKS;
}
