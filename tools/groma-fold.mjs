#!/usr/bin/env node
// Вливает компоненты, которые groma создаёт для новых файлов пакетов, в компонент пакета (TASK-39).
// groma владеет файлами, а не каталогами: каждый новый файл после scan становится
// отдельным компонентом. Скрипт сканирует, находит компоненты, все файлы которых лежат
// в packages/<пакет>/, и объединяет их с владельцем пакета через CLI groma.
// Запуск: node tools/groma-fold.mjs [--dry-run]
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Пакет -> id компонента-владельца на карте. */
export const OWNERS = { sim: 'sim', content: 'content', render: 'render', app: 'ui', save: 'save' };
const CONTAINER = 'browser-game';
const ROOT = '.groma';

const dryRun = process.argv.includes('--dry-run');
const groma = (...args) => {
  console.log(`groma ${args.join(' ')}`);
  if (!dryRun) execFileSync('groma', args, { stdio: 'inherit' });
};

/** Все файлы компонентов под .groma. */
function componentFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...componentFiles(path));
    else if (name.endsWith('.md') && dir.endsWith('components')) out.push(path);
  }
  return out;
}

/** id, родитель и файлы кода из frontmatter компонента (простая построчная разборка). */
export function parseComponent(text) {
  const id = /^\s+id: (\S+)$/m.exec(text)?.[1];
  const parent = /^\s+parent: (\S+)$/m.exec(text)?.[1];
  const files = [...text.matchAll(/^\s+file: (\S+)$/gm)].map((m) => m[1]);
  const hasBody = text.split(/^---$/m).slice(2).join('').trim().length > 0;
  return { id, parent, files, hasBody };
}

/** Владелец, если все файлы компонента лежат в одном пакете из OWNERS. */
export function ownerOf(files) {
  const pkgs = new Set(files.map((f) => /^packages\/([^/]+)\//.exec(f)?.[1]));
  if (pkgs.size !== 1) return undefined;
  const [pkg] = pkgs;
  return pkg ? OWNERS[pkg] : undefined;
}

function main() {
  if (!dryRun) execFileSync('groma', ['scan'], { stdio: 'inherit' });
  const owners = new Set(Object.values(OWNERS));
  const fold = new Map();
  for (const path of componentFiles(ROOT)) {
    const c = parseComponent(readFileSync(path, 'utf8'));
    if (!c.id || owners.has(c.id) || c.files.length === 0) continue;
    const owner = ownerOf(c.files);
    if (!owner) continue;
    if (c.hasBody) {
      console.log(`пропуск ${c.id}: у компонента есть описание, решить вручную`);
      continue;
    }
    if (c.parent !== CONTAINER) groma('edit', c.id, '--parent', CONTAINER);
    fold.set(owner, [...(fold.get(owner) ?? []), c.id]);
  }
  for (const [owner, ids] of fold) groma('edit', owner, '--combine', ...ids);
  if (fold.size === 0) console.log('лишних компонентов нет');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
