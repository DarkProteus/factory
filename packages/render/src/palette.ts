// Палитра из docs/style.md. Цвета берутся только отсюда, по имени токена.

export const palette = {
  outline: 0x141210,
  shadow: 0x000000,
  'ground-0': 0x2a2622,
  'ground-1': 0x2e2924,
  'ground-2': 0x27231f,
  grid: 0x3a342d,
  'ore-iron': 0x7c8790,
  'ore-iron-dark': 0x4e575e,
  'steel-dark': 0x3b3f42,
  steel: 0x5a6064,
  'steel-light': 0x8a9094,
  'rust-dark': 0x5c2e1a,
  rust: 0x8b4a2b,
  'rust-light': 0xb8693a,
  hazard: 0xd9a441,
  'hazard-dark': 0x1c1a18,
  'heat-1': 0xff8a3d,
  'heat-2': 0xffc46b,
  plate: 0xc9ced1,
  'plate-light': 0xe8ecee,
  brass: 0xc9a14a,
  'lamp-work': 0x9fc26b,
  'lamp-wait': 0xd9a441,
  'lamp-off': 0x4a4540,
  ok: 0x7fb5a0,
  bad: 0xc2452d,
  text: 0xe6dfd3,
} as const;

export type Token = keyof typeof palette;

/** Альфа токенов, у которых она не 1. */
export const SHADOW_ALPHA = 0.35;

/** Размер клетки при зуме 1, px. */
export const CELL = 32;
