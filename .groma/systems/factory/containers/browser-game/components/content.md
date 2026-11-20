---
type: C4 Component
title: Контент
status: stable
groma:
  id: content
  parent: browser-game
  code:
    - scanner: typescript
      file: packages/content/src/index.ts
      symbol: PACKAGE
    - scanner: typescript
      file: packages/content/src/items.ts
      symbol: items
    - scanner: typescript
      file: packages/content/src/recipes.ts
      symbol: recipes
    - scanner: typescript
      file: packages/content/src/buildings.ts
      symbol: buildings
    - scanner: typescript
      file: packages/content/src/types.ts
    - scanner: typescript
      file: packages/content/src/player.ts
      symbol: INVENTORY_SLOTS
    - scanner: typescript
      file: packages/content/src/map.ts
  technology: TypeScript
description: Типизированные таблицы предметов, рецептов, зданий и врагов
---

Только данные и типы, без логики. Таблицы items, recipes и buildings объявлены через satisfies со строгими типами id (ItemId, BuildingId), поэтому опечатку в ссылке ловит компилятор; тест-валидатор дополнительно проверяет ссылки во время выполнения. Поле behavior связывает здание с поведением в Ядре симуляции, остальные поля — его параметры (скорость конвейера, время добычи, размер буферов). Здесь же константы игрока, например число ячеек инвентаря.
