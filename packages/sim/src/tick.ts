import { runBehaviors } from './behaviors';
import { applyCommand, type Command } from './commands';
import { runMining } from './mining';
import type { SimState } from './state';

/**
 * Один шаг симуляции. Мутирует состояние на месте (без копий на каждый тик).
 * Команды применяются по порядку в текущем тике, затем работают здания
 * по возрастанию id, затем идёт ручная добыча игрока, затем счётчик растёт на 1.
 */
export function tick(state: SimState, commands: readonly Command[]): void {
  for (const command of commands) applyCommand(state, command);
  runBehaviors(state);
  runMining(state);
  state.tick += 1;
}
