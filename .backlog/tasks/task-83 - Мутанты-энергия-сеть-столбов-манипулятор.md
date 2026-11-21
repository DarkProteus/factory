---
id: TASK-83
title: 'Мутанты: энергия, сеть столбов, манипулятор'
status: In Progress
assignee: []
created_date: '2026-11-21T17:55:00Z'
updated_date: '2026-11-21T19:17:00Z'
labels:
  - quality
milestone: m-7
dependencies:
  - TASK-72
references:
  - sim
modified_files:
  - packages/sim/src/powerUnit.test.ts
  - packages/sim/src/inserterUnit.test.ts
  - packages/sim/src/networkUnit.test.ts
priority: medium
type: chore
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Выжившие мутанты Stryker (TASK-72, исходный прогон). Дописать тесты, которые их убивают; поведение кода не менять. Проверка: pnpm mutate (инкрементально) и отчёт reports/mutation/mutation.json по этим файлам. Эквивалентный мутант (поведение не меняется) не убивать, а перечислить в заметках задачи. Перед началом прогнать pnpm mutate: прогон TASK-72 шёл на старой базе, номера строк могли сдвинуться.
Файлы: power.ts (16/5 — порядок сетей, учёт draw), network.ts (13 — union-find ra < rb, зона покрытия столба), inserter.ts (13 — электрический и неэлектрический манипулятор не различаются тестами).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Выжившие в power.ts, network.ts, inserter.ts убиты или помечены эквивалентными
- [x] #2 pnpm test зелёный
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Мутационный счёт по своим файлам (pnpm mutate, Stryker), до -> после: power.ts 73.20 -> 95.88; network.ts 91.04 -> 97.01; inserter.ts 75.93 -> 98.15; вместе 82.11 -> 96.84 (выжило 46 + 5 без покрытия, осталось 9). Тесты: powerUnit.test.ts, networkUnit.test.ts, inserterUnit.test.ts (неэлектрический манипулятор создан в defs внутри теста, content не тронут). Оставшиеся 9 мутантов эквивалентны: inserter.ts 28:25 (from === to -> false): одно здание не может занимать клетки и позади, и впереди манипулятора, условие недостижимо. network.ts 42 (убран parent.set в find): сжатие путей только ускорение, результат тот же. network.ts 54 (ra < rb -> ra <= rb): при ra === rb функция уже вернулась выше. network.ts 84 (i <= poles.length): на лишней итерации внутренний цикл пуст. network.ts 83 (начальный массив рёбер с мусорной строкой): элемент без d2/a/b даёт ra === rb (оба undefined), union ничего не делает. power.ts 61 (два мутанта, условие true и b.draw || ...): флаги draw потребителей в сети уже сняты в цикле выше, для остальных результат тот же. power.ts 68 (два мутанта на ?. в kw): kw зовётся только для зданий из сетей, у них energy задан, ветка недостижима.
<!-- SECTION:NOTES:END -->
