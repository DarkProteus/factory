// Хеш состояния: стабильная сериализация (ключи по порядку) + FNV-1a 64 бита.

export function stableStringify(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Нельзя хешировать число ${value}`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const parts = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
    return `{${parts.join(',')}}`;
  }
  throw new Error(`Нельзя хешировать значение типа ${typeof value}`);
}

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

/** FNV-1a 64 по кодовым единицам UTF-16; результат — 16 hex-символов. */
export function fnv1a64(text: string): string {
  let h = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h = BigInt.asUintN(64, (h ^ BigInt(code & 0xff)) * FNV_PRIME);
    h = BigInt.asUintN(64, (h ^ BigInt(code >>> 8)) * FNV_PRIME);
  }
  return h.toString(16).padStart(16, '0');
}

export function hash(state: unknown): string {
  return fnv1a64(stableStringify(state));
}
