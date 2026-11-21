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
  // Сталь: печь выбирает рецепт по пришедшей пластине (открывается технологией steel).
  steelPlate: { in: { ironPlate: 5 }, out: { steelPlate: 1 }, ticks: 960, madeIn: 'furnace' },
  // Научные пакеты.
  sciencePackRed: { in: { copperPlate: 1, ironGear: 1 }, out: { sciencePackRed: 1 }, ticks: 300, madeIn: 'assembler' },
  sciencePackGreen: { in: { inserter: 1, belt: 1 }, out: { sciencePackGreen: 1 }, ticks: 360, madeIn: 'assembler' },
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
  // Здания M3.
  lab: { in: { circuit: 10, ironGear: 10, belt: 4 }, out: { lab: 1 }, ticks: 120, madeIn: 'assembler' },
  undergroundBelt: { in: { ironPlate: 10, belt: 5 }, out: { undergroundBelt: 2 }, ticks: 60, madeIn: 'assembler' },
  fastUndergroundBelt: {
    in: { undergroundBelt: 2, steelPlate: 4 },
    out: { fastUndergroundBelt: 2 },
    ticks: 60,
    madeIn: 'assembler',
  },
  fastBelt: { in: { belt: 1, steelPlate: 1, ironGear: 2 }, out: { fastBelt: 1 }, ticks: 30, madeIn: 'assembler' },
  fastInserter: { in: { inserter: 1, circuit: 3 }, out: { fastInserter: 1 }, ticks: 30, madeIn: 'assembler' },
  filterSplitter: { in: { splitter: 1, circuit: 5 }, out: { filterSplitter: 1 }, ticks: 60, madeIn: 'assembler' },
} satisfies Record<string, RecipeDef<ItemId, BuildingId>>;

/** id рецепта из таблицы recipes. */
export type RecipeId = keyof typeof recipes;
