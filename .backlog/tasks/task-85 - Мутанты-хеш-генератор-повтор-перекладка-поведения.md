---
id: TASK-85
title: 'Мутанты: хеш, генератор, повтор, перекладка, поведения'
status: In Progress
assignee: []
created_date: '2026-11-21T17:55:00Z'
updated_date: '2026-11-21T18:19:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-72
references:
  - sim
priority: low
type: chore
ordinal: 91000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Выжившие мутанты Stryker (TASK-72, исходный прогон). Дописать тесты, которые их убивают; поведение кода не менять. Проверка: pnpm mutate (инкрементально) и отчёт reports/mutation/mutation.json по этим файлам. Эквивалентный мутант (поведение не меняется) не убивать, а перечислить в заметках задачи. Перед началом прогнать pnpm mutate: прогон TASK-72 шёл на старой базе, номера строк могли сдвинуться.
Файлы: transfer.ts (15/3), hash.ts (7/2 — тексты ошибок, литералы stableStringify), rng.ts (2 — тесты не фиксируют значения генератора: добавить эталонную последовательность для зерна), replay.ts (1), behaviors.ts (2). Тексты сообщений об ошибках можно считать эквивалентными.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Выжившие в transfer.ts, hash.ts, rng.ts, replay.ts, behaviors.ts убиты или помечены эквивалентными
- [ ] #2 У rng есть тест с эталонной последовательностью
- [ ] #3 pnpm test зелёный
<!-- AC:END -->
