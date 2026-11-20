---
type: C4 Component
title: Интерфейс
status: stable
groma:
  id: ui
  parent: browser-game
  code:
    - scanner: react
      file: packages/app/src/App.tsx
    - scanner: typescript
      file: packages/app/src/App.tsx
    - scanner: react
      file: packages/app/src/main.tsx
    - scanner: typescript
      file: packages/app/src/main.tsx
    - scanner: react
      file: packages/app/src/ui/BuildPanel.tsx
    - scanner: typescript
      file: packages/app/src/ui/BuildPanel.tsx
      symbol: BuildPanel
    - scanner: typescript
      file: packages/app/src/ui/fonts.ts
    - scanner: typescript
      file: packages/app/src/game.ts
    - scanner: react
      file: packages/app/src/ui/Hud.tsx
    - scanner: typescript
      file: packages/app/src/ui/Hud.tsx
      symbol: Hud
    - scanner: typescript
      file: packages/app/src/input.ts
    - scanner: typescript
      file: packages/app/src/ui/names.ts
      symbol: buildingName
    - scanner: typescript
      file: packages/app/src/persist.ts
    - scanner: react
      file: packages/app/src/ui/MineButton.tsx
    - scanner: typescript
      file: packages/app/src/ui/MineButton.tsx
      symbol: MineButton
    - scanner: react
      file: packages/app/src/ui/CraftQueue.tsx
    - scanner: typescript
      file: packages/app/src/ui/CraftQueue.tsx
      symbol: CraftQueue
    - scanner: typescript
      file: packages/app/src/craftUi.ts
    - scanner: react
      file: packages/app/src/ui/InventoryWindow.tsx
    - scanner: typescript
      file: packages/app/src/ui/InventoryWindow.tsx
      symbol: InventoryWindow
    - scanner: react
      file: packages/app/src/ui/ItemSlot.tsx
    - scanner: typescript
      file: packages/app/src/ui/ItemSlot.tsx
      symbol: ItemSlot
    - scanner: typescript
      file: packages/app/src/ui/useTick.ts
      symbol: useTick
  technology: React
description: Превращает ввод игрока в команды для ядра
---

Точка входа приложения. Игровой цикл (game.ts) крутит Ядро симуляции с фиксированным шагом 60 тиков в секунду и после каждого кадра вызывает Рендер. Ввод мыши и клавиатуры превращается в команды build и demolish: они копятся в очереди и уходят в ядро на ближайшем тике, напрямую состояние интерфейс не меняет. Перед кликом интерфейс проверяет место через canPlace и передаёт Рендеру оверлей с призраком. Панели (строительство, снос, номер тика) — React-компоненты поверх canvas, оформлены по docs/style.md. Пока нет стартового меню, игра начинается с демо-сцены.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [packages/app/src/App.tsx](../../../../../../packages/app/src/App.tsx) | [packages/sim/src/index.ts](../../../../../../packages/sim/src/index.ts) | Подключает ядро | TypeScript import |
| [packages/app/src/App.tsx](../../../../../../packages/app/src/App.tsx) | [packages/content/src/index.ts](../../../../../../packages/content/src/index.ts) | Подключает контент | TypeScript import |
| [packages/app/src/App.tsx](../../../../../../packages/app/src/App.tsx) | [packages/render/src/index.ts](../../../../../../packages/render/src/index.ts) | Подключает рендер | TypeScript import |
| [packages/app/src/App.tsx](../../../../../../packages/app/src/App.tsx) | [packages/save/src/index.ts](../../../../../../packages/save/src/index.ts) | Подключает сохранения | TypeScript import |
| [packages/app/src/game.ts](../../../../../../packages/app/src/game.ts) | [packages/sim/src/index.ts](../../../../../../packages/sim/src/index.ts) | Отправляет команды, тикает | Вызов функций, 60 тиков/с |
| [packages/app/src/game.ts](../../../../../../packages/app/src/game.ts) | [packages/render/src/index.ts](../../../../../../packages/render/src/index.ts) | Рисует кадр | Вызов функций, requestAnimationFrame |
