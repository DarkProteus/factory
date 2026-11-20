// Только типы: никакой логики и импортов из других пакетов.

export interface ItemDef {
  name: string;
  /** Сколько предметов помещается в одну ячейку. */
  stack: number;
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
  | 'container';

export interface BuildingDef<I extends string = string> {
  /** Ширина и высота в клетках. */
  size: readonly [number, number];
  power: number;
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
  /** Число ячеек (контейнер). */
  slots?: number;
  /** Скорость конвейера: единиц пути за тик; клетка конвейера — 256 единиц (BELT_CELL в sim). */
  beltSpeed?: number;
  /** id предмета-боеприпаса (турели). */
  ammo?: I;
  range?: number;
}
