---
id: TASK-25
title: 'Контент M2: ресурсы, предметы, рецепты, здания'
status: Done
assignee: []
created_date: '2026-11-20T18:38:00Z'
updated_date: '2026-11-20T18:49:00Z'
labels:
  - m2
dependencies: []
references:
  - content
modified_files:
  - packages/content/src/types.ts
  - packages/content/src/items.ts
  - packages/content/src/recipes.ts
  - packages/content/src/buildings.ts
  - packages/content/src/player.ts
  - packages/content/src/map.ts
  - packages/content/src/index.ts
  - packages/content/src/content.test.ts
  - packages/content/src/map.test.ts
  - packages/sim/src/crafter.ts
  - packages/sim/src/crafter.test.ts
  - packages/sim/src/grid.test.ts
  - packages/sim/src/canplace.test.ts
  - packages/render/src/overlay.test.ts
type: feature
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. Архитектурное решение (основная сессия, 2026-11-20):
- ItemDef получает необязательное fuel (кДж).
- BuildingDef: поле power заменяется на energy?: { kind: 'electric', kw } | { kind: 'fuel', kw } | { kind: 'generator', kw }. Без energy здание энергии не берёт.
- Предмет-здание имеет тот же id, что и здание (items.drill для buildings.drill), stack 50 (belt, pole — 100).
- Ручной крафт = рецепты с madeIn: 'assembler'; плавка — madeIn: 'furnace'.
- crafter получает recipeMode: 'byInput' (печь) | 'chosen' (сборщик); печь и генератор — fuelSlot: true.
- Behavior дополняется 'splitter' и 'pole'; pole получает coverage: 5 и wireReach: 7.
- В player.ts: START_KIT (стартовый набор) и MINING_TICKS = 30; стартовая карта — startMap в новом файле map.ts.
sim должен собираться и проходить тесты: здания без реализованного поведения просто стоят.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Предметы, рецепты и здания из таблиц design.md лежат в content; рецепт патронов — 4 ironPlate
- [x] #2 Типы ItemDef и BuildingDef расширены по решению в описании; sim и тесты собираются
- [x] #3 Валидатор ловит здание без предмета-здания и предмет-здание без рецепта madeIn: assembler
- [x] #4 Валидатор ловит fuel-здание без fuelSlot и рецепт печи с несколькими входами
- [x] #5 startMap: 128×128, по пятну ironOre, copperOre, coal, stone в 10–20 клетках от центра; START_KIT по design.md
<!-- AC:END -->
