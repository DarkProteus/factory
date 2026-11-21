import { SAVE_VERSION } from '@factory/save';
import { createState, hash, tick, type SimState } from '@factory/sim';
import { describe, expect, it } from 'vitest';
import {
  BROKEN_KEY,
  clearSave,
  loadGame,
  SAVE_INTERVAL_TICKS,
  SAVE_KEY,
  saveGame,
  shouldAutosave,
  type KeyValueStorage,
} from './persist';

/** Новая партия: стартовая карта и стартовый набор. */
const newGame = () => createState(1);

class FakeStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
  removeItem = (k: string) => void this.data.delete(k);
}

/** Хранилище, у которого любая операция бросает исключение (приватный режим, квота). */
const brokenStorage: KeyValueStorage = {
  getItem() {
    throw new Error('недоступно');
  },
  setItem() {
    throw new Error('квота');
  },
  removeItem() {
    throw new Error('недоступно');
  },
};

const advance = (state: SimState, n: number) => {
  for (let i = 0; i < n; i++) tick(state, []);
};

describe('loadGame', () => {
  it('без сохранения стартует новая партия без ошибки', () => {
    const r = loadGame(new FakeStorage(), newGame);
    expect(hash(r.state)).toBe(hash(newGame()));
    expect(r.error).toBeNull();
  });

  it('сохранение загружается, хеш совпадает с сохранённым', () => {
    const storage = new FakeStorage();
    const state = newGame();
    advance(state, 200);
    expect(saveGame(storage, state)).toBeNull();
    const r = loadGame(storage, newGame);
    expect(r.error).toBeNull();
    expect(r.state.tick).toBe(200);
    expect(hash(r.state)).toBe(hash(state));
  });

  it('загруженная партия дальше идёт так же, как исходная', () => {
    const storage = new FakeStorage();
    const state = newGame();
    advance(state, 100);
    saveGame(storage, state);
    const loaded = loadGame(storage, newGame).state;
    advance(state, 300);
    advance(loaded, 300);
    expect(hash(loaded)).toBe(hash(state));
  });

  it('битое сохранение: новая партия, сообщение, копия в factory.save.broken', () => {
    const storage = new FakeStorage();
    storage.setItem(SAVE_KEY, '{не json');
    const r = loadGame(storage, newGame);
    expect(hash(r.state)).toBe(hash(newGame()));
    expect(r.error).toContain('Сохранение повреждено');
    expect(r.error).toContain('Начата новая партия');
    expect(storage.getItem(BROKEN_KEY)).toBe('{не json');
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('неизвестная версия тоже считается ошибкой сохранения', () => {
    const storage = new FakeStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 99, state: {} }));
    const r = loadGame(storage, newGame);
    expect(r.error).toContain('Неизвестная версия');
    expect(storage.getItem(BROKEN_KEY)).not.toBeNull();
  });

  it('сохранение версии M1 не загружается: новая партия с уведомлением', () => {
    const storage = new FakeStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION - 2, state: {} }));
    const r = loadGame(storage, newGame);
    expect(hash(r.state)).toBe(hash(newGame()));
    expect(r.error).toContain('устарело');
    expect(r.error).toContain('Начата новая партия');
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(storage.getItem(BROKEN_KEY)).not.toBeNull();
  });

  it('недоступный localStorage не роняет игру', () => {
    const r = loadGame(brokenStorage, newGame);
    expect(hash(r.state)).toBe(hash(newGame()));
    expect(r.error).toContain('Начата новая партия');
  });

  it('storage = null (localStorage недоступен целиком): новая партия и сообщение', () => {
    const r = loadGame(null, newGame);
    expect(hash(r.state)).toBe(hash(newGame()));
    expect(r.error).toContain('Начата новая партия');
  });
});

describe('saveGame и clearSave', () => {
  it('ошибка записи возвращается строкой и не бросает', () => {
    expect(saveGame(brokenStorage, newGame())).toContain('Не удалось сохранить');
    expect(saveGame(null, newGame())).toContain('Не удалось сохранить');
  });

  it('clearSave удаляет сохранение и не бросает при сбое хранилища', () => {
    const storage = new FakeStorage();
    saveGame(storage, newGame());
    clearSave(storage);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(() => clearSave(brokenStorage)).not.toThrow();
    expect(() => clearSave(null)).not.toThrow();
  });
});

describe('shouldAutosave', () => {
  it('раз в 1800 тиков от последнего сохранения', () => {
    expect(SAVE_INTERVAL_TICKS).toBe(1800);
    expect(shouldAutosave(1799, 0)).toBe(false);
    expect(shouldAutosave(1800, 0)).toBe(true);
    expect(shouldAutosave(2000, 500)).toBe(false);
    expect(shouldAutosave(2300, 500)).toBe(true);
  });
});
