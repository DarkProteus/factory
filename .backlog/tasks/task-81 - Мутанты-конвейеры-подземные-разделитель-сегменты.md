---
id: TASK-81
title: 'Мутанты: конвейеры, подземные, разделитель, сегменты'
status: In Progress
assignee: []
created_date: '2026-11-21T17:54:00Z'
updated_date: '2026-11-21T18:19:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-72
references:
  - sim
priority: medium
type: chore
ordinal: 87000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Выжившие мутанты Stryker (TASK-72, исходный прогон). Дописать тесты, которые их убивают; поведение кода не менять. Проверка: pnpm mutate (инкрементально) и отчёт reports/mutation/mutation.json по этим файлам. Эквивалентный мутант (поведение не меняется) не убивать, а перечислить в заметках задачи. Перед началом прогнать pnpm mutate: прогон TASK-72 шёл на старой базе, номера строк могли сдвинуться.
Файлы: underground.ts (29 выживших, 1 без покрытия — граница дальности k <= reach + 1, фильтр предметов тоннеля), segments.ts (12 — защита от самоссылки next === b, seen в обходе), splitter.ts (5 — условие выхода подземного, граница круга), belt.ts (3 — вход в разделитель).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Выжившие в underground.ts, segments.ts, splitter.ts, belt.ts убиты или помечены эквивалентными
- [ ] #2 pnpm test зелёный
<!-- AC:END -->
