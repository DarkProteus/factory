---
id: TASK-81
title: 'Мутанты: конвейеры, подземные, разделитель, сегменты'
status: Done
assignee: []
created_date: '2026-11-21T17:54:00Z'
updated_date: '2026-11-21T19:19:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-72
references:
  - sim
modified_files:
  - packages/sim/src/underground.edge.test.ts
  - packages/sim/src/segments.test.ts
  - packages/sim/src/splitter.edge.test.ts
  - packages/sim/src/belt.edge.test.ts
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
- [x] #1 Выжившие в underground.ts, segments.ts, splitter.ts, belt.ts убиты или помечены эквивалентными
- [x] #2 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Процент убитых мутантов (Stryker, исходный прогон на текущей базе -> после): underground.ts 79.2% -> 95.1%, segments.ts 91.2% -> 98.0%, splitter.ts 92.3% -> 98.3%, belt.ts 94.4% -> 100%. Тесты: underground.edge.test.ts, segments.test.ts (новый), splitter.edge.test.ts, belt.edge.test.ts; код модулей не менялся. Оставшиеся 11 мутантов (7 + 2 + 2) эквивалентны. underground.ts: L34:37 и L34:61 (DX/DY * k * step -> * k / step: step равен только 1 или -1, деление на него даёт то же число); L59 (back?.b !== b -> false и back.b: ближайший подземный назад от выхода, найденного как ближайший вперёд от b, всегда сам b, null невозможен); L52 (кеш пар -> false: отключение кеша меняет только скорость); L63 ({version, defs, map} -> {}: пустая запись кеша всегда промах, снова только скорость); L111:39 ((from.belt ?? []) -> ["Stryker was here"]: у строки нет pos, фильтр pos > BELT_CELL даёт тот же пустой список). splitter.ts: L21:9 (next !== null -> true: isUnderground(null) сам возвращает false); L69 (k < allowed.length -> <=: лишняя итерация повторяет первую попытку с тем же состоянием, она уже не удалась). segments.ts: L78 (кеш сегментов -> false: только скорость) и L99 ({version, defs, steps} -> {}: пустая запись кеша, то же самое).
<!-- SECTION:NOTES:END -->
