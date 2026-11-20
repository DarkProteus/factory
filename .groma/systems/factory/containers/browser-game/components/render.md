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
    - scanner: typescript
      file: packages/render/src/interp.ts
    - scanner: typescript
      file: packages/render/src/draw/items.ts
      symbol: drawItem
    - scanner: typescript
      file: packages/render/src/scene.ts
      symbol: Scene
    - scanner: typescript
      file: packages/render/src/draw/shapes.ts
    - scanner: typescript
      file: packages/render/src/palette.ts
    - scanner: typescript
      file: packages/render/src/wear.ts
    - scanner: typescript
      file: packages/render/src/camera.ts
    - scanner: typescript
      file: packages/render/src/controls.ts
    - scanner: typescript
      file: packages/render/src/renderer.ts
    - scanner: typescript
      file: packages/render/src/draw/ground.ts
    - scanner: typescript
      file: packages/render/src/draw/buildings.ts
    - scanner: typescript
      file: packages/render/src/overlay.ts
  technology: TypeScript, PixiJS
description: Рисует состояние мира, ничего в нём не меняя
---

Читает состояние Ядра симуляции и рисует его, интерполируя между тиками. В состояние не пишет.

Сейчас пакет — заглушка, экспортирует только имя; PixiJS ещё не подключён.

## Derived relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [packages/render/src/draw/buildings.ts](../../../../../../packages/render/src/draw/buildings.ts) | [packages/render/src/overlay.ts](../../../../../../packages/render/src/overlay.ts) | Invokes supplied callback: armAngle | typescript |
