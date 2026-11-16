/** Состояние симуляции: только простые данные, сериализуется в JSON без потерь. */
export interface SimState {
  /** Номер текущего тика; растёт на 1 за шаг. */
  tick: number;
  /** Состояние генератора случайных чисел (см. rng.ts). */
  rng: number;
  /** Служебные счётчики, которые меняют команды setCounter и rollCounter. */
  counters: Record<string, number>;
}

export function createState(seed: number): SimState {
  return { tick: 0, rng: seed | 0, counters: {} };
}
