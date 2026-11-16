---
id: TASK-1
title: Каркас монорепо
status: Done
assignee:
  - '@claude'
created_date: '2026-11-16T15:54:00Z'
updated_date: '2026-11-16T16:12:00Z'
labels: []
dependencies: []
documentation:
  - docs/design.md
type: chore
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Веха M0. Проект пуст: есть только дизайн-док и правила. Все остальные задачи предполагают pnpm-монорепо с пятью пакетами (`sim`, `content`, `render`, `app`, `save`) и работающим Vitest. Граница «`sim` импортирует только `content`» должна проверяться автоматически с первого дня, иначе ядро перестанет запускаться без браузера. Стек: TypeScript, Vite, pnpm workspaces, PixiJS, React, Zustand, Vitest.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 В `packages/` есть пакеты `sim`, `content`, `render`, `app`, `save`, подключённые через pnpm workspaces
- [x] #2 `pnpm test` проходит (в каждом пакете есть хотя бы один тест Vitest)
- [x] #3 `pnpm build` проходит
- [x] #4 Линтер падает с ошибкой на импорте `render` или `app` из `sim`; это проверено пробным импортом
- [x] #5 `pnpm dev` открывает страницу приложения локально
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Корень: package.json (скрипты test/build/dev/lint), pnpm-workspace.yaml, tsconfig.base.json, .gitignore.
2. Пакеты @factory/{sim,content,render,app,save} как source-only библиотеки (exports → src/index.ts), у каждого tsconfig и тест-заглушка. В sim/content/save tsconfig без DOM-типов.
3. Сначала тест tools/boundaries.test.ts: через ESLint API проверяет, что импорт render/app из sim даёт ошибку, а content разрешён, и что настоящий код sim чист.
4. eslint.config.js с no-restricted-imports для packages/sim.
5. app: Vite + React, минимальная страница; build = typecheck всех пакетов + vite build.
6. Проверить pnpm test, pnpm build, pnpm lint, pnpm dev.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Проверено: pnpm test (6 файлов, 14 тестов), pnpm build, pnpm lint зелёные; пробный import '@factory/render' в packages/sim даёт no-restricted-imports; pnpm dev отдаёт страницу.
<!-- SECTION:NOTES:END -->
