---
type: C4 Component
title: Рендер
status: stable
groma:
  id: render
  parent: browser-game
  code:
    - scanner: typescript
      file: packages/render/src/index.ts
      symbol: PACKAGE
  technology: TypeScript, PixiJS
description: Рисует состояние мира, ничего в нём не меняя
---

Читает состояние Ядра симуляции и рисует его, интерполируя между тиками. В состояние не пишет.

Сейчас пакет — заглушка, экспортирует только имя; PixiJS ещё не подключён.
