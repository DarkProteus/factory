---
id: TASK-85
title: 'Мутанты: хеш, генератор, повтор, перекладка, поведения'
status: Done
assignee: []
created_date: '2026-11-21T17:55:00Z'
updated_date: '2026-11-21T19:05:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-72
references:
  - sim
modified_files:
  - packages/sim/src/rng.test.ts
  - packages/sim/src/hash.test.ts
  - packages/sim/src/replay.test.ts
  - packages/sim/src/transfer.test.ts
  - packages/sim/src/behaviors.test.ts
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
- [x] #1 Выжившие в transfer.ts, hash.ts, rng.ts, replay.ts, behaviors.ts убиты или помечены эквивалентными
- [x] #2 У rng есть тест с эталонной последовательностью
- [x] #3 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Мутации (Stryker, по 5 файлам, concurrency 2). До: behaviors 63.0% (17/27), hash 85.7% (42/49), transfer 76.5% (117/153), replay 100%, rng 100%; итого 78.5% (194/247). После: behaviors 66.7% (18/27), hash 95.9% (47/49), transfer 94.1% (144/153), replay 100%, rng 100%; итого 91.9% (227/247). Тесты: rng.test.ts (эталон 5 шагов для зёрен 0, 1, 12345, -1), hash.test.ts, replay.test.ts, transfer.test.ts, behaviors.test.ts (неизвестный тип здания).

Оставшиеся эквивалентные мутанты. behaviors.ts 34-43 (метки case belt/underground/splitter/filterSplitter/generator/pole/container/turret, замена на пустую строку или пустое тело): эти ветки пустые (continue), без метки поведение проваливается в конец switch и в тот же continue; turret в content нет (NoCoverage 43:12). transfer.ts 78-81 (метки miner/inserter/pole/turret в accept): ветка пустая (return), без метки управление идёт в unreachable-return, результат тот же (undefined). transfer.ts 104:5 и 104:18 (case belt пустой): проваливается в ветку underground, отличается только при pos > BELT_CELL, чего у предмета на belt не бывает. transfer.ts 110:28 и 127:33 (b.belt ?? [] и b.input ?? [] заменены на массив со строкой): у строки нет pos и count, условия ложны, результат null как у пустого массива. hash.ts 8:50 и 19:19 (тексты ошибок): по условию задачи эквивалентны. Прогоны Stryker и pnpm test в этой сессии шли при высокой нагрузке от параллельных агентов: начальный прогон Stryker падал по таймауту чужих тестов, belt.bench.test.ts (бенчмарк, 4 мс на тик) в pnpm test падал по времени (4.7 мс), без бенча 951 тест зелёные.
<!-- SECTION:NOTES:END -->
