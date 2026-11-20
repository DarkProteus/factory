// Только типы: никакой логики и импортов из других пакетов.

export interface ItemDef {
  name: string;
  /** Сколько предметов помещается в одну ячейку. */
  stack: number;
}

export interface RecipeDef {
  /** id предмета -> количество. */
  in: Record<string, number>;
  out: Record<string, number>;
  /** Длительность в тиках симуляции. */
  ticks: number;
  /** id здания из таблицы buildings. */
  madeIn: string;
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

export interface BuildingDef {
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
  ammo?: string;
  range?: number;
}
