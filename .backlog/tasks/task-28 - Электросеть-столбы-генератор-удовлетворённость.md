---
id: TASK-28
title: 'Электросеть: столбы, генератор, удовлетворённость'
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m2
milestone: m-2
dependencies:
  - TASK-25
  - TASK-26
  - TASK-27
references:
  - sim
modified_files:
  - packages/sim/src/network.ts
  - packages/sim/src/fuel.ts
  - packages/sim/src/power.ts
  - packages/sim/src/buildings.ts
  - packages/sim/src/behaviors.ts
  - packages/sim/src/crafter.ts
  - packages/sim/src/miner.ts
  - packages/sim/src/inserter.ts
  - packages/sim/src/testKit.ts
  - packages/sim/src/miner.test.ts
  - packages/sim/src/inserter.test.ts
  - packages/sim/src/fuel.test.ts
  - packages/sim/src/assembler.test.ts
  - packages/sim/src/smelting.test.ts
  - packages/sim/src/power.test.ts
  - packages/save/src/index.test.ts
  - packages/render/src/scene.test.ts
  - .groma/systems/factory/containers/browser-game/components/sim.md
type: feature
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: основная сессия (архитектура: представление сетей, их пересчёт при стройке и сносе, детерминированная дробная скорость). Решение записать в задачу перед реализацией.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Столбы в радиусе wireReach образуют сеть; стройка и снос столба пересчитывают сети; здание в сети столба с меньшим id
- [x] #2 Удовлетворённость = min(1, мощность генераторов / спрос работающих потребителей); простаивающие не в спросе
- [x] #3 Бур, манипулятор и сборщик работают со скоростью × удовлетворённость; вне сети стоят
- [x] #4 Генератор жжёт топливо по реальной нагрузке, без топлива даёт 0
- [x] #5 Детерминизм: хеш-тест с сетью стабилен; состояние сети входит в хеш или выводится из сохранённого
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Решение (основная сессия, 2026-11-21):

- Сети — выведенный кеш, не состояние. network.ts строит их из зданий и сбрасывает по topologyVersion, как сегменты конвейеров. Столбы соединяются, если dx²+dy² ≤ wireReach² (берётся меньший reach из двух). id сети = наименьший id столба в компоненте. Здание с energy electric или generator попадает в сеть, если его отпечаток пересекает квадрат покрытия столба; столбы перебираются по возрастанию id, побеждает первый.
- Спрос считается с лагом в один тик. Потребитель, который в этом тике хотел работать, ставит флаг b.draw. В начале следующего тика power.ts суммирует kw помеченных зданий сети, затем снимает флаги. Флаг лежит в здании, поэтому попадает в хеш и сейв. Так сеть целиком выводится из сохранённого состояния, и не нужно дублировать предикаты «хочу работать» каждого поведения.
- Удовлетворённость — целое число sat в диапазоне 0..POWER_SCALE (65536): floor(supply·SCALE/demand), не больше SCALE. При demand = 0 sat = SCALE, если есть живой генератор, иначе 0.
- Дробная скорость без дробей. Каждый тик здание прибавляет sat к аккумулятору b.charge. Когда набирается SCALE, progress растёт на 1 тик. Семантика progress (целые тики) не меняется.
- Генератор живой, если у него есть топливо или остаток burn. Отданная энергия за тик = min(supply, demand)·1000 Вт·тик. Она делится между живыми генераторами пропорционально kw, остаток от деления достаётся первому по id. Каждый генератор списывает свою долю через burnEnergy (fuel.ts).
- Что гейтится. Бур: шаг добычи; выдача из буфера свободна. Манипулятор: захват требует sat > 0, шаг взмаха идёт через аккумулятор; ожидание с полным взмахом — простой, в спрос не входит. Сборщик: каждый тик цикла и старт цикла. Без сети (sat undefined) здание стоит и в спрос не входит.

Итог: 341 тест зелёный. Тестам sim, где есть буры, манипуляторы или сборщики, сеть даёт помощник testKit.electrify; в тестах save и render генератор и столбы стоят прямо в раскладке. Для отображения (TASK-33): powerNetworks(state) отдаёт сети и провода, powerStats(state) — выработку, спрос и удовлетворённость за последний тик. Допущение: генератор с маленьким остатком burn считается живым на полную мощность в течение одного тика.
<!-- SECTION:NOTES:END -->
