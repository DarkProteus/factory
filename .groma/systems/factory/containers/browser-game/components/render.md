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

Читает состояние Ядра симуляции и рисует его на PixiJS строго по docs/style.md: земля и залежи, здания в своей ориентации, предметы на конвейерах, анимации бура, манипулятора и печи. Всё рисуется кодом, без спрайтов; износ (ржавчина, камни) детерминирован хешем координат. Между тиками позиции интерполируются: перед каждым тиком сцена снимает снимок конвейеров. Сюда же входят камера (панорама, зум 0.5–3) и её управление мышью и клавиатурой, оверлей стройки (призрак здания, сетка, подсветка) и иконки зданий для панели. Состояние принимается как DeepReadonly и не меняется.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [packages/render/src/scene.ts](../../../../../../packages/render/src/scene.ts) | [packages/sim/src/index.ts](../../../../../../packages/sim/src/index.ts) | Читает состояние | DeepReadonly<SimState> |
