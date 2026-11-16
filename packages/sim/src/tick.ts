import { applyCommand, type Command } from './commands';
import type { SimState } from './state';

/**
 * Один шаг симуляции. Мутирует состояние на месте (без копий на каждый тик).
 * Команды применяются по порядку в текущем тике, затем счётчик растёт на 1.
 */
export function tick(state: SimState, commands: readonly Command[]): void {
  for (const command of commands) applyCommand(state, command);
  state.tick += 1;
}
