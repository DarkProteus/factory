import { createResearch, type SimState } from '@factory/sim';
import { SaveError } from './errors';
import { validateState } from './validate';

export const PACKAGE = '@factory/save';

export { SaveError } from './errors';

/** Версия формата сохранения; растёт при несовместимых изменениях SimState. */
export const SAVE_VERSION = 4;

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
  if (version === 3) return migrateFromM2(state);
  if (version !== SAVE_VERSION) {
    // Версии старше 3 (M1) не мигрируются: партия начинается заново.
    if (typeof version === 'number' && version < 3) {
      throw new SaveError(`Сохранение устарело: версия ${version}, игра читает только версию ${SAVE_VERSION}.`);
    }
    throw new SaveError(`Неизвестная версия сохранения: ${String(version)}. Эта игра читает версию ${SAVE_VERSION}.`);
  }
  return validateState(state);
}

/**
 * Версия 3 (M2) -> 4 (M3): добавляются пустые исследования (открыты только стартовые рецепты)
 * и пустой список событий. Здания, в том числе разделители, остаются как есть.
 */
function migrateFromM2(state: unknown): SimState {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) return validateState(state);
  return validateState({ ...state, research: createResearch(), events: [] });
}
