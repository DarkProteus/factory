---
id: TASK-39
title: 'Groma: новые файлы пакетов попадают в отдельные компоненты'
status: Done
assignee: []
created_date: '2026-11-20T19:07:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - tooling
milestone: m-2
dependencies: []
references:
  - sim
  - content
modified_files:
  - tools/groma-fold.mjs
  - tools/groma-fold.test.ts
  - CLAUDE.md
type: chore
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
За сессию 2026-11-20 groma пять раз создавал отдельный компонент для нового файла пакета (map.ts, mining.ts, craftQueue.ts, testKit.ts, fuel.ts), один раз даже на уровне системы, а не контейнера. Каждый раз приходилось объединять вручную (groma edit <владелец> --combine). Похоже на TASK-12, но для sim. Нужно найти настройку (.groma/config.json, правила владения по каталогу пакета) или порядок работы, при котором файлы packages/<пакет>/src/** сразу принадлежат компоненту пакета. Исполнитель: основная сессия (настройка инструмента, сверить с groma agent-instructions и --help).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Новый файл в packages/sim/src или packages/content/src после сканирования принадлежит компоненту sim или content без ручного combine
- [x] #2 Решение записано в CLAUDE.md или в задаче; лишний пункт про combine в CLAUDE.md убран, если он больше не нужен
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Решение: в groma нет владения каталогом — code-ссылки идут на отдельные файлы, а scan кладёт каждый новый незакреплённый файл в новый компонент (иногда на уровень системы). Настройки в config.json для этого нет. Сделан скрипт tools/groma-fold.mjs: groma scan, затем компоненты без описания, все файлы которых в packages/<пакет>/, переносятся в контейнер browser-game (если нужно) и объединяются с компонентом пакета. Шаг ревью в CLAUDE.md заменён на запуск скрипта. Критерий #1 выполняется скриптом, а не самим groma.
<!-- SECTION:NOTES:END -->
