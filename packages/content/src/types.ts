// Только типы: никакой логики и импортов из других пакетов.

export interface ItemDef {
  name: string;
  /** Сколько предметов помещается в одну ячейку. */
  stack: number;
  /** Энергия при сжигании, кДж (топливо). */
  fuel?: number;
}

/** id предмета -> количество; при узком I не все предметы обязательны. */
type ItemCounts<I extends string> = string extends I ? Record<string, number> : Partial<Record<I, number>>;

/**
 * Параметры I и B ограничивают id предметов и зданий. По умолчанию это
 * просто строки, а таблицы content подставляют свои настоящие id.
 */
export interface RecipeDef<I extends string = string, B extends string = string> {
  /** id предмета -> количество. */
  in: ItemCounts<I>;
  out: ItemCounts<I>;
  /** Длительность в тиках симуляции. */
  ticks: number;
  /** id здания из таблицы buildings. */
  madeIn: B;
}

export type Behavior =
  | 'miner'
  | 'belt'
  | 'inserter'
  | 'crafter'
  | 'generator'
  | 'lab'
  | 'turret'
  | 'container'
  | 'splitter'
  | 'filterSplitter'
  | 'underground'
  | 'pole';

/** Откуда здание берёт энергию (kw — мощность в кВт). */
export type EnergyDef =
  /** Потребляет из электросети. */
  | { kind: 'electric'; kw: number }
  /** Жжёт топливо из своей ячейки. */
  | { kind: 'fuel'; kw: number }
  /** Выдаёт в сеть, жжёт топливо по нагрузке. */
  | { kind: 'generator'; kw: number };

export interface BuildingDef<I extends string = string> {
  /** Ширина и высота в клетках. */
  size: readonly [number, number];
  /** Без energy здание энергии не берёт. */
  energy?: EnergyDef;
  behavior: Behavior;
  hp: number;
  /** Тиков на единицу руды (бур). */
  miningTicks?: number;
  /** Вместимость выходного буфера, шт. */
  buffer?: number;
  /** Тиков на перенос предмета (манипулятор). */
  swingTicks?: number;
  /** Вместимость входа крафтера в циклах рецепта: на ингредиент in[item] * inputBuffer шт. */
  inputBuffer?: number;
  /** Как крафтер выбирает рецепт: по пришедшему входу (печь) или игроком (сборщик). */
  recipeMode?: 'byInput' | 'chosen';
  /** Есть ячейка топлива на одну стопку (печь, генератор). */
  fuelSlot?: boolean;
  /** Сторона квадрата покрытия сети, клеток (столб). */
  coverage?: number;
  /** Радиус автосоединения со столбами, клеток (столб). */
  wireReach?: number;
  /** Число ячеек (контейнер). */
  slots?: number;
  /** Скорость конвейера: единиц пути за тик; клетка конвейера — 256 единиц (BELT_CELL в sim). */
  beltSpeed?: number;
  /** Сколько клеток может быть между входом и выходом подземного конвейера. */
  undergroundReach?: number;
  /** id предмета-боеприпаса (турели). */
  ammo?: I;
  range?: number;
}

/**
 * Технология: N единиц исследования, единица — набор пакетов и время.
 * Параметры I, T и R ограничивают id предметов, технологий и рецептов.
 * Открывает только рецепты; здание открывается рецептом своего предмета.
 */
export interface TechnologyDef<I extends string = string, T extends string = string, R extends string = string> {
  name: string;
  /** Пакеты на одну единицу: id предмета -> количество. */
  unit: ItemCounts<I>;
  /** Сколько единиц нужно изучить. */
  units: number;
  /** Длительность одной единицы в тиках симуляции (при полной сети). */
  unitTicks: number;
  /** id технологий, которые должны быть изучены раньше. */
  requires: readonly T[];
  /** id рецептов, которые открывает технология. */
  unlocks: readonly R[];
}
