import type { BuildingId } from './buildings';
import type { ItemId } from './items';
import type { RecipeDef } from './types';

export const recipes = {
  // Плавка: печь выбирает рецепт по пришедшей руде, поэтому вход ровно один.
  smeltIron: { in: { ironOre: 1 }, out: { ironPlate: 1 }, ticks: 180, madeIn: 'furnace' },
  smeltCopper: { in: { copperOre: 1 }, out: { copperPlate: 1 }, ticks: 180, madeIn: 'furnace' },
  smeltStone: { in: { stone: 1 }, out: { stoneBrick: 1 }, ticks: 180, madeIn: 'furnace' },
  // Промежуточные предметы и патроны (в сборщике и руками).
  ironGear: { in: { ironPlate: 2 }, out: { ironGear: 1 }, ticks: 30, madeIn: 'assembler' },
  copperCable: { in: { copperPlate: 1 }, out: { copperCable: 2 }, ticks: 30, madeIn: 'assembler' },
  circuit: { in: { ironPlate: 1, copperCable: 3 }, out: { circuit: 1 }, ticks: 60, madeIn: 'assembler' },
  ammo: { in: { ironPlate: 4 }, out: { ammo: 1 }, ticks: 60, madeIn: 'assembler' },
  // Предметы-здания: id рецепта совпадает с id здания.
  drill: { in: { ironPlate: 10, ironGear: 5, circuit: 3 }, out: { drill: 1 }, ticks: 120, madeIn: 'assembler' },
  furnace: { in: { stone: 5 }, out: { furnace: 1 }, ticks: 30, madeIn: 'assembler' },
  inserter: { in: { ironPlate: 1, ironGear: 1, circuit: 1 }, out: { inserter: 1 }, ticks: 30, madeIn: 'assembler' },
  belt: { in: { ironPlate: 1, ironGear: 1 }, out: { belt: 2 }, ticks: 30, madeIn: 'assembler' },
  splitter: { in: { ironPlate: 5, circuit: 2, belt: 2 }, out: { splitter: 1 }, ticks: 60, madeIn: 'assembler' },
  chest: { in: { ironPlate: 8 }, out: { chest: 1 }, ticks: 30, madeIn: 'assembler' },
  assembler: { in: { ironPlate: 9, ironGear: 5, circuit: 3 }, out: { assembler: 1 }, ticks: 120, madeIn: 'assembler' },
  pole: { in: { ironPlate: 1, copperCable: 2 }, out: { pole: 2 }, ticks: 30, madeIn: 'assembler' },
  generator: { in: { ironPlate: 10, ironGear: 5, stoneBrick: 10 }, out: { generator: 1 }, ticks: 120, madeIn: 'assembler' },
} satisfies Record<string, RecipeDef<ItemId, BuildingId>>;
