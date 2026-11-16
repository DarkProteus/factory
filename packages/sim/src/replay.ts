import type { Command } from './commands';
import type { SimState } from './state';
import { tick } from './tick';

/** Команда, привязанная к номеру тика, в котором её надо применить. */
export interface ScheduledCommand {
  tick: number;
  command: Command;
}

/** Прогоняет `count` тиков от текущего; команды тика идут в порядке списка. */
export function runTicks(state: SimState, schedule: readonly ScheduledCommand[], count: number): void {
  const byTick = new Map<number, Command[]>();
  for (const { tick: at, command } of schedule) {
    const list = byTick.get(at);
    if (list) list.push(command);
    else byTick.set(at, [command]);
  }
  for (let i = 0; i < count; i++) tick(state, byTick.get(state.tick) ?? []);
}
