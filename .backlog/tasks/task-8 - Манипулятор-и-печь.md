---
id: TASK-8
title: Манипулятор и печь
status: Done
assignee: []
created_date: '2026-11-16T15:55:00Z'
updated_date: '2026-11-20T14:54:00Z'
labels: []
dependencies:
  - TASK-6
  - TASK-7
references:
  - sim
  - content
documentation:
  - docs/design.md
modified_files:
  - packages/content/src/types.ts
  - packages/content/src/buildings.ts
  - packages/content/src/content.test.ts
  - packages/sim/src/inventory.test.ts
  - packages/sim/src/inserter.test.ts
  - packages/sim/src/crafter.test.ts
  - packages/sim/src/smelting.test.ts
  - packages/sim/src/buildings.ts
  - packages/sim/src/inventory.ts
  - packages/sim/src/crafter.ts
  - packages/sim/src/transfer.ts
  - packages/sim/src/inserter.ts
  - packages/sim/src/behaviors.ts
  - .groma/systems/factory/containers/browser-game/components/sim.md
type: feature
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Веха M1. Системы «Манипуляторы» и «Производство», поведения `inserter` и `crafter`: манипулятор перекладывает предметы между конвейером и зданием, печь работает по рецепту из `content`. Вместе с буром и конвейером это замыкает цель M1: руда сама превращается в пластины. M1 также называет сундук, для которого нет отдельной задачи; он понадобится здесь как приёмник пластин.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Манипулятор и печь описаны в `content` с `behavior: inserter` и `behavior: crafter`
- [x] #2 Манипулятор перекладывает предмет с конвейера в здание и из здания на конвейер по своему направлению
- [x] #3 Печь делает пластину из руды по рецепту за число тиков, заданное в `ticks`
- [x] #4 100 руды, поданные по конвейеру, превращаются ровно в 100 пластин: ничего не теряется и не дублируется
- [x] #5 Печь не забирает руды больше, чем вмещает: при полном входе манипулятор ждёт
- [x] #6 При полном выходе печь останавливается и продолжает после разгрузки
- [x] #7 Сундук описан в content с behavior: container, манипулятор кладёт в него и берёт из него предметы
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Архитектурные решения (основная сессия, 2026-11-20):

Content
- types.ts: в Behavior добавить 'container'. В BuildingDef новые поля: swingTicks (тиков на перенос, манипулятор), inputBuffer (вместимость входа крафтера в циклах рецепта: на ингредиент in[item] * inputBuffer шт.), slots (число ячеек, контейнер).
- buildings.ts: inserter { size [1,1], behavior 'inserter', hp 50, swingTicks 30 }; furnace дополнить inputBuffer 2, buffer 50; chest { size [1,1], behavior 'container', hp 100, slots 16 }. power 0.
- Валидатор в content.test.ts: рецепт с madeIn у здания behavior crafter имеет ровно один предмет в out (крафтер M1 держит один выходной стек).

Состояние PlacedBuilding (простые данные, входят в хеш)
- output: ItemStack | null — как сейчас; у манипулятора это его «рука» (ёмкость 1).
- input?: ItemStack[] — вход крафтера, по стеку на ингредиент.
- recipe?: string — текущий рецепт крафтера.
- slots?: ItemStack[] — ячейки контейнера.

Ячейки — новый модуль sim/src/inventory.ts: функции над ItemStack[] с числом ячеек и stack из content.items (canAdd, add, takeFirst). Ячейка: один вид, не больше stack. Этот же модуль потом использует инвентарь игрока (TASK-16).

Обмен предметами — модуль sim/src/transfer.ts, по behavior цели:
- canAccept(b, item) / accept(b, item): belt — pushToBelt (зазор в начале); crafter — item есть в in рецепта и вход не полон; container — inventory.canAdd. Остальные (miner, inserter) не принимают.
- takeFrom(b, accepts): belt — первый предмет от головы ряда, который принимает цель; здания с output (miner, crafter) — из output; container — первая непустая ячейка. Берёт только то, что цель примет прямо сейчас.

Рецепт печи: если recipe не задан, крафтер при первом принятом предмете берёт первый рецепт (порядок content.recipes) с madeIn === тип здания и этим предметом во in. Когда вход, выход пусты и progress 0, recipe сбрасывается.

Цикл крафтера: при progress 0 старт, если на входе есть все ингредиенты и в output есть место под out (output пуст или тот же предмет и count + out <= buffer); на старте ингредиенты списываются, progress = 1. Далее progress += 1; при progress >= ticks выход пополняется, progress = 0. Выход полон — новый цикл не стартует (AC #6).

Манипулятор: берёт из клетки позади (против dir), кладёт в клетку впереди (по dir), через buildingAt — работает с любым отпечатком. Рука пуста: если цель есть и что-то примет, взять один предмет (мгновенно), progress = 0. Рука полна: progress += 1; при progress >= swingTicks положить, если цель принимает, иначе ждать (progress не растёт дальше). Нет здания позади/впереди — ничего не делает.

Порядок в тике не меняется: здания по возрастанию id (miner, inserter, crafter), конвейеры последними. Файлы: inserter.ts, crafter.ts, transfer.ts, inventory.ts; behaviors.ts только диспетчер. Каждый файл до 300 строк.

Тест AC #4: руда кладётся на конвейер (pushToBelt по мере места) → манипулятор → печь → манипулятор → сундук. После достаточного числа тиков в сундуке ровно 100 ironPlate, руды нигде нет. Плюс инвариант на каждом тике: руда + пластины по всему состоянию = 100.
<!-- SECTION:PLAN:END -->
