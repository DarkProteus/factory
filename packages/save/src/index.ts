import type { SimState } from '@factory/sim';
import { SaveError } from './errors';
import { validateState } from './validate';

export const PACKAGE = '@factory/save';

export { SaveError } from './errors';

/** Версия формата сохранения; растёт при несовместимых изменениях SimState. */
export const SAVE_VERSION = 2;

/** Версия 1 не хранила исходный запас залежи: лучшее, что известно, — остаток на момент сохранения. */
function migrateV1(state: unknown): void {
  const deposits = (state as { map?: { deposits?: unknown } } | null)?.map?.deposits;
  if (!Array.isArray(deposits)) return;
  for (const d of deposits) {
    if (typeof d === 'object' && d !== null && !('initial' in d)) {
      (d as { initial?: unknown }).initial = (d as { amount?: unknown }).amount;
    }
  }
}

export interface SaveFile {
  version: number;
  state: SimState;
}

/** Состояние -> строка JSON с номером версии формата. Состояние не меняется. */
export function serialize(state: SimState): string {
  const file: SaveFile = { version: SAVE_VERSION, state };
  return JSON.stringify(file);
}

/** Строка -> состояние. На любую проблему бросает SaveError с понятным сообщением. */
export function deserialize(text: string): SimState {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SaveError('Сохранение повреждено: файл не является корректным JSON.');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data) || !('version' in data)) {
    throw new SaveError('Сохранение повреждено: не найден номер версии формата.');
  }
  const { version, state } = data as { version: unknown; state?: unknown };
  if (version === 1) migrateV1(state);
  else if (version !== SAVE_VERSION) {
    throw new SaveError(
      `Неизвестная версия сохранения: ${String(version)}. Эта игра читает версию ${SAVE_VERSION}.`,
    );
  }
  return validateState(state);
}
