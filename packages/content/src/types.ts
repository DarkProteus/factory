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
  | 'turret';

export interface BuildingDef {
  /** Ширина и высота в клетках. */
  size: readonly [number, number];
  power: number;
  behavior: Behavior;
  hp: number;
  /** id предмета-боеприпаса (турели). */
  ammo?: string;
  range?: number;
}
