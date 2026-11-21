// Связь правил design.md с тестами (TASK-75).
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — скрипт на JS без типов
import { coverage, parseRefs, parseRules } from './rule-coverage.mjs';

const DOC = [
  '## Веха M1: решения',
  '- вне разделов «M2+» тоже считается',
  '## Веха M9: решения',
  '**Раздел.**',
  '- правило в две строки,',
  '  вторая строка <!-- rule: two-lines -->',
  '- ручное <!-- rule: eyes, manual -->',
  '**Абзац.** текст абзаца <!-- rule: para -->',
  '- без метки',
  '| таблица | не правило |',
  '## Прочее',
  '- не правило',
].join('\n');

describe('parseRules', () => {
  const { rules, untagged } = parseRules(DOC);
  it('метка на последней строке многострочного правила находится', () => {
    expect(rules.map((r: { id: string }) => r.id)).toEqual(['two-lines', 'eyes', 'para']);
  });
  it('manual отмечается, голый заголовок и таблица не правила', () => {
    expect(rules.find((r: { id: string }) => r.id === 'eyes').manual).toBe(true);
    expect(untagged.map((u: { text: string }) => u.text)).toEqual(['- вне разделов «M2+» тоже считается', '- без метки']);
  });
});

describe('parseRefs', () => {
  it('несколько id через запятую', () => {
    expect(parseRefs("  // rule: a, b-c\nit('x')\n// rule: d")).toEqual(['a', 'b-c', 'd']);
  });
});

describe('репозиторий', () => {
  const r = coverage(fileURLToPath(new URL('..', import.meta.url)));
  it('нет битых ссылок, повторных id и правил без метки', () => {
    expect(r.dangling).toEqual([]);
    expect(r.duplicates).toEqual([]);
    expect(r.untagged).toEqual([]);
  });
});
