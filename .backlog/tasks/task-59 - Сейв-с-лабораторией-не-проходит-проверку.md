---
id: TASK-59
title: Сейв с лабораторией не проходит проверку
status: Done
assignee: []
created_date: '2026-11-21T12:43:00Z'
updated_date: '2026-11-21T12:45:00Z'
labels:
  - m3
dependencies: []
references:
  - save
modified_files:
  - packages/save/src/validate.ts
  - packages/save/src/validateResearch.ts
  - packages/save/src/lab.test.ts
priority: high
type: bug
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
После TASK-49 у лаборатории есть b.input без b.recipe и поле b.unit. checkCrafterInput в packages/save/src/validate.ts падает с «вход без рецепта», поле unit не проверяется. Автосохранение с лабораторией не загрузится, и игра начнёт новую партию.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Сейв с лабораторией (ячейки пакетов и идущая единица) сохраняется и загружается, хеш совпадает
- [x] #2 unit проверяется как id технологии; неверный unit отвергается
- [x] #3 pnpm test зелёный
<!-- AC:END -->
