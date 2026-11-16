import { nextRandom } from './rng';
import type { SimState } from './state';

/** Служебные команды без игровой механики; игровые добавят TASK-5 и позже. */
export type Command =
  /** Записывает значение в счётчик. */
  | { type: 'setCounter'; key: string; value: number }
  /** Записывает в счётчик очередное число генератора. */
  | { type: 'rollCounter'; key: string };

export function applyCommand(state: SimState, command: Command): void {
  switch (command.type) {
    case 'setCounter':
      state.counters[command.key] = command.value;
      return;
    case 'rollCounter':
      state.counters[command.key] = nextRandom(state);
      return;
  }
}
