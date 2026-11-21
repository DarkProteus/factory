---
id: TASK-68
title: Бенч конвейеров падает под нагрузкой
status: Done
assignee: []
created_date: '2026-11-21T14:39:00Z'
updated_date: '2026-11-21T19:37:00Z'
labels:
  - m3
milestone: m-3
dependencies: []
references:
  - sim
modified_files:
  - packages/sim/src/belt.bench.test.ts
type: chore
ordinal: 74000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
packages/sim/src/belt.bench.test.ts уже берёт минимум из 15 пачек, но под внешней нагрузкой (load average > 20) всё окно ~1,5 с медленное. Предложение: повтор всего замера до 3 раз (retry), тест проходит, если хоть одна попытка уложилась в порог. Порог не менять.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Бенч повторяет замер до 3 раз, порог прежний
- [x] #2 pnpm test зелёный
<!-- AC:END -->
