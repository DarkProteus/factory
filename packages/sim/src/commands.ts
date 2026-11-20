import { demolishAt, placeBuilding, type BuildingDefs, type Dir } from './buildings';
import { startMining, stopMining } from './mining';
import { nextRandom } from './rng';
import type { SimState } from './state';

/** Служебные команды и команды строительства. Неверные команды игнорируются без изменений. */
export type Command =
  /** Записывает значение в счётчик. */
  | { type: 'setCounter'; key: string; value: number }
  /** Записывает в счётчик очередное число генератора. */
  | { type: 'rollCounter'; key: string }
  /** Ставит здание с левой верхней клеткой (x, y). */
  | { type: 'build'; building: string; x: number; y: number; dir: Dir }
  /** Сносит здание, которому принадлежит клетка (x, y). */
  | { type: 'demolish'; x: number; y: number }
  /** Начинает ручную добычу на клетке (x, y), пока не придёт stopMining. */
  | { type: 'startMining'; x: number; y: number }
  /** Прекращает ручную добычу. */
  | { type: 'stopMining' };

/** `defs` — таблица зданий; по умолчанию content.buildings (параметр нужен тестам). */
export function applyCommand(state: SimState, command: Command, defs?: BuildingDefs): void {
  switch (command.type) {
    case 'setCounter':
      state.counters[command.key] = command.value;
      return;
    case 'rollCounter':
      state.counters[command.key] = nextRandom(state);
      return;
    case 'build':
      placeBuilding(state, command.building, command.x, command.y, command.dir, defs);
      return;
    case 'demolish':
      demolishAt(state, command.x, command.y, defs);
      return;
    case 'startMining':
      startMining(state, command.x, command.y);
      return;
    case 'stopMining':
      stopMining(state);
      return;
  }
}
