import { demolishAt, placeBuilding, type BuildingDefs, type Dir } from './buildings';
import { setRecipe } from './assembler';
import { setFilter } from './splitter';
import { startMining, stopMining } from './mining';
import { cancelCraft, enqueueCraft } from './craftQueue';
import { putIntoBuilding, takeFromBuilding, type BuildingSlot } from './manual';
import { setResearch } from './research';
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
  | { type: 'stopMining' }
  /** Ставит в очередь ручного крафта count изготовлений рецепта, ингредиенты списываются сразу. */
  | { type: 'craft'; recipe: string; count: number }
  /** Убирает запись очереди ручного крафта и возвращает ингредиенты. */
  | { type: 'cancelCraft'; index: number }
  /** Задаёт рецепт сборщика (id здания); содержимое при смене уходит в инвентарь, не помещается — смена запрещена. */
  | { type: 'setRecipe'; building: number; recipe: string }
  /** Переносит ячейку здания (id) в инвентарь целиком или сколько помещается. */
  | { type: 'takeFromBuilding'; building: number; slot: BuildingSlot }
  /** Кладёт из инвентаря в здание до count предметов туда, куда положил бы манипулятор; лишнее остаётся в инвентаре. */
  | { type: 'putIntoBuilding'; building: number; item: string; count: number }
  /** Выбирает активную технологию: только доступную и неизученную; прогресс прочих сохраняется. */
  | { type: 'setResearch'; tech: string }
  /** Задаёт фильтр фильтрующего разделителя (id здания); null снимает фильтр. */
  | { type: 'setFilter'; building: number; item: string | null };

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
    case 'craft':
      enqueueCraft(state, command.recipe, command.count);
      return;
    case 'cancelCraft':
      cancelCraft(state, command.index);
      return;
    case 'setRecipe':
      setRecipe(state, command.building, command.recipe, defs);
      return;
    case 'takeFromBuilding':
      takeFromBuilding(state, command.building, command.slot);
      return;
    case 'putIntoBuilding':
      putIntoBuilding(state, command.building, command.item, command.count, defs);
      return;
    case 'setResearch':
      setResearch(state, command.tech);
      return;
    case 'setFilter':
      setFilter(state, command.building, command.item, defs);
      return;
  }
}
