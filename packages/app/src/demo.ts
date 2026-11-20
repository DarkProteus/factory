// Демо-сцена до появления интерфейса стройки (TASK-10): залежь, буры,
// конвейеры, манипуляторы, печь и сундук. Собирается обычными командами build.
import { applyCommand, createState, type Command, type SimState } from '@factory/sim';

const deposits: { x: number; y: number; item: string; amount: number }[] = [];
for (let y = 18; y < 26; y++) {
  for (let x = 18; x < 26; x++) deposits.push({ x, y, item: 'ironOre', amount: 40 + ((x * 7 + y * 13) % 10) * 40 });
}

const build = (building: string, x: number, y: number, dir: 0 | 1 | 2 | 3): Command => ({ type: 'build', building, x, y, dir });

const commands: Command[] = [
  build('drill', 20, 20, 1),
  build('drill', 20, 22, 1),
  build('drill', 24, 18, 2),
  build('drill', 18, 24, 3),
  build('belt', 22, 22, 0),
  build('belt', 22, 21, 0),
  ...[22, 23, 24, 25, 26, 27, 28, 29].map((x) => build('belt', x, 20, 1)),
  build('inserter', 30, 20, 1),
  build('furnace', 31, 20, 1),
  build('inserter', 33, 20, 1),
  build('chest', 34, 20, 1),
];

export const DEMO_CENTER = { x: 26, y: 21 };

export function createDemo(seed = 1): SimState {
  const state = createState(seed, { width: 64, height: 64, deposits });
  // Постройка тратит предмет-здание: перед стройкой кладём в инвентарь ровно столько, сколько нужно демо.
  const need: Record<string, number> = {};
  for (const c of commands) if (c.type === 'build') need[c.building] = (need[c.building] ?? 0) + 1;
  for (const [item, count] of Object.entries(need)) state.inventory.push({ item, count });
  for (const c of commands) applyCommand(state, c);
  return state;
}
