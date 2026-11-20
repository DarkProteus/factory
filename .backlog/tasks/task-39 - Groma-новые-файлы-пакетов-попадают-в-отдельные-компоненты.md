---
id: TASK-39
title: 'Groma: новые файлы пакетов попадают в отдельные компоненты'
status: To Do
assignee: []
created_date: '2026-11-20T19:07:00Z'
labels:
  - tooling
dependencies: []
references:
  - sim
  - content
type: chore
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
За сессию 2026-11-20 groma пять раз создавал отдельный компонент для нового файла пакета (map.ts, mining.ts, craftQueue.ts, testKit.ts, fuel.ts), один раз даже на уровне системы, а не контейнера. Каждый раз приходилось объединять вручную (groma edit <владелец> --combine). Похоже на TASK-12, но для sim. Нужно найти настройку (.groma/config.json, правила владения по каталогу пакета) или порядок работы, при котором файлы packages/<пакет>/src/** сразу принадлежат компоненту пакета. Исполнитель: основная сессия (настройка инструмента, сверить с groma agent-instructions и --help).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Новый файл в packages/sim/src или packages/content/src после сканирования принадлежит компоненту sim или content без ручного combine
- [ ] #2 Решение записано в CLAUDE.md или в задаче; лишний пункт про combine в CLAUDE.md убран, если он больше не нужен
<!-- AC:END -->
