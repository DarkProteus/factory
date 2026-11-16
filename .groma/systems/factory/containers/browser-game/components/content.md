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
  technology: TypeScript
description: Типизированные таблицы предметов, рецептов, зданий и врагов
---

Только данные, без логики. Новый предмет, рецепт или враг добавляется записью; поле behavior связывает здание с поведением в Ядре симуляции. Валидатор проверяет, что ссылки между таблицами существуют.

Сейчас пакет — заглушка, экспортирует только имя.
