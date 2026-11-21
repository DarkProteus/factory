import { describe, expect, it } from 'vitest';
import { fnv1a64, hash, stableStringify } from './hash';

describe('stableStringify', () => {
  it('примитивы сериализуются как JSON', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(true)).toBe('true');
    expect(stableStringify(false)).toBe('false');
    expect(stableStringify('x"y')).toBe('"x\\"y"');
    expect(stableStringify(-3.5)).toBe('-3.5');
    expect(stableStringify(0)).toBe('0');
  });

  it('массив: порядок сохраняется, разделитель запятая без пробелов', () => {
    expect(stableStringify([])).toBe('[]');
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]');
    expect(stableStringify([[1], null])).toBe('[[1],null]');
  });

  it('объект: ключи по порядку, формат ключ:значение, без пробелов', () => {
    expect(stableStringify({})).toBe('{}');
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(stableStringify({ b: [1, { z: null, a: true }], a: 'x"y' })).toBe('{"a":"x\\"y","b":[1,{"a":true,"z":null}]}');
  });

  it('ключи сортируются как строки, а ключ экранируется', () => {
    expect(stableStringify({ '10': 1, '9': 2, 'a"b': 3 })).toBe('{"10":1,"9":2,"a\\"b":3}');
  });

  it('число не из конечных и значения других типов бросают ошибку', () => {
    expect(() => stableStringify(NaN)).toThrow();
    expect(() => stableStringify(Infinity)).toThrow();
    expect(() => stableStringify(-Infinity)).toThrow();
    expect(() => stableStringify({ a: [NaN] })).toThrow();
    expect(() => stableStringify(undefined)).toThrow();
    expect(() => stableStringify(() => 1)).toThrow();
    expect(() => stableStringify(1n)).toThrow();
    expect(() => stableStringify(Symbol('s'))).toThrow();
  });
});

describe('fnv1a64', () => {
  it('эталонные значения (кодовые единицы UTF-16, по два байта)', () => {
    expect(fnv1a64('')).toBe('cbf29ce484222325');
    expect(fnv1a64('a')).toBe('089be207b544f1e4');
    expect(fnv1a64('foobar')).toBe('c882d5010e965f1a');
    expect(fnv1a64('Привет')).toBe('63ff07c96f0ecd3f');
    expect(fnv1a64('Ā')).toBe('08328707b4eb6e3a');
  });

  it('старший байт кодовой единицы влияет на результат', () => {
    expect(fnv1a64('Ā')).not.toBe(fnv1a64('\u0000'));
    expect(fnv1a64('Ł')).not.toBe(fnv1a64('A'));
  });
});

describe('hash', () => {
  it('эталон и независимость от порядка ключей', () => {
    expect(hash({ b: [1, { z: null, a: true }], a: 'x"y' })).toBe('8aa01dc931226bec');
    expect(hash({ a: 1, b: 2 })).toBe(hash({ b: 2, a: 1 }));
    expect(hash({ a: 1 })).not.toBe(hash({ a: 2 }));
  });

  it('16 hex-символов с ведущими нулями', () => {
    expect(hash(1)).toMatch(/^[0-9a-f]{16}$/);
    expect(fnv1a64('a')).toHaveLength(16);
  });
});
