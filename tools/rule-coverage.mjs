// Покрытие правил design.md тестами (TASK-75).
// Правило — пункт списка или абзац с жирным заголовком в разделах «## Веха Mx: решения».
// Метка правила — `<!-- rule: id -->` в конце его последней строки; `<!-- rule: id, manual -->` —
// правило проверяется глазами или плейтестом, тест не нужен.
// Тест ссылается на правило комментарием `// rule: id` в начале строки (можно несколько через запятую) над it/describe.
// Запуск: node tools/rule-coverage.mjs [--strict]. Без --strict падает только на битых ссылках,
// повторных id и правилах без метки; с --strict — ещё и на правилах без тестов.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const MARK = /<!--\s*rule:\s*([a-z0-9-]+)(\s*,\s*manual)?\s*-->/;
const REF = /^\s*\/\/\s*rule:\s*([a-z0-9-]+(?:\s*,\s*[a-z0-9-]+)*)/gm;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.claude', '.stryker-tmp', 'reports']);

/** Правила из текста design.md: id, manual, строка; плюс строки-правила без метки. */
export function parseRules(text) {
  const rules = [];
  const untagged = [];
  let inDecisions = false;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) inDecisions = /^## Веха M\d+: решения/.test(line);
    if (!inDecisions) continue;
    // Начало правила: пункт списка или «**Заголовок.** текст» (голый заголовок раздела — не правило).
    const isBullet = line.startsWith('- ');
    const isPara = /^\*\*[^*]+\*\*\s*\S/.test(line);
    if (!isBullet && !isPara) continue;
    let end = i;
    while (end + 1 < lines.length && lines[end + 1].trim() && !/^(- |\*\*|#|\|)/.test(lines[end + 1])) end++;
    const m = lines.slice(i, end + 1).join('\n').match(MARK);
    if (m) rules.push({ id: m[1], manual: Boolean(m[2]), line: i + 1 });
    else untagged.push({ line: i + 1, text: line.slice(0, 80) });
  }
  return { rules, untagged };
}

/** Ссылки `// rule: id` из текста теста. */
export function parseRefs(text) {
  const ids = [];
  for (const m of text.matchAll(REF)) ids.push(...m[1].split(',').map((s) => s.trim()));
  return ids;
}

function testFiles(root, dir = root, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) testFiles(root, p, out);
    else if (/\.(test|spec)\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Отчёт по репозиторию: покрытые, непокрытые, ручные, битые ссылки, повторы, правила без метки. */
export function coverage(root) {
  const { rules, untagged } = parseRules(readFileSync(join(root, 'docs/design.md'), 'utf8'));
  const refs = new Map();
  for (const f of testFiles(root)) {
    for (const id of parseRefs(readFileSync(f, 'utf8'))) {
      if (!refs.has(id)) refs.set(id, []);
      refs.get(id).push(relative(root, f));
    }
  }
  const known = new Set(rules.map((r) => r.id));
  const seen = new Set();
  const duplicates = rules.filter((r) => (seen.has(r.id) ? true : (seen.add(r.id), false))).map((r) => r.id);
  return {
    covered: rules.filter((r) => !r.manual && refs.has(r.id)).map((r) => ({ ...r, files: refs.get(r.id) })),
    uncovered: rules.filter((r) => !r.manual && !refs.has(r.id)),
    manual: rules.filter((r) => r.manual),
    dangling: [...refs].filter(([id]) => !known.has(id)).map(([id, files]) => ({ id, files })),
    duplicates,
    untagged,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const r = coverage(process.cwd());
  const total = r.covered.length + r.uncovered.length;
  console.log(`Правила с тестами: ${r.covered.length} из ${total}; ручных: ${r.manual.length}.`);
  for (const u of r.uncovered) console.log(`  без теста: ${u.id} (design.md:${u.line})`);
  for (const d of r.dangling) console.log(`  битая ссылка: ${d.id} в ${d.files.join(', ')}`);
  for (const d of r.duplicates) console.log(`  повтор id: ${d}`);
  for (const u of r.untagged) console.log(`  правило без метки: design.md:${u.line} ${u.text}`);
  const broken = r.dangling.length + r.duplicates.length + r.untagged.length;
  process.exit(broken > 0 || (strict && r.uncovered.length > 0) ? 1 : 0);
}
