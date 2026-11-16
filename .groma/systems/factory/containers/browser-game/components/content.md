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
  technology: TypeScript
description: Типизированные таблицы предметов, рецептов, зданий и врагов
---

Только данные, без логики. Новый предмет, рецепт или враг добавляется записью; поле behavior связывает здание с поведением в Ядре симуляции. Валидатор проверяет, что ссылки между таблицами существуют.

Сейчас пакет — заглушка, экспортирует только имя.
