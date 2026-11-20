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
    - scanner: typescript
      file: packages/app/src/demo.ts
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
  technology: React
description: Превращает ввод игрока в команды для ядра
---

Монтирует React-приложение в страницу и собирает остальные пакеты вместе. По замыслу переводит мышь и клавиатуру в команды Ядра симуляции и показывает панели строительства.

Сейчас выводит заголовок и список подключённых пакетов.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [packages/app/src/App.tsx](../../../../../../packages/app/src/App.tsx) | [packages/sim/src/index.ts](../../../../../../packages/sim/src/index.ts) | Подключает ядро | TypeScript import |
| [packages/app/src/App.tsx](../../../../../../packages/app/src/App.tsx) | [packages/content/src/index.ts](../../../../../../packages/content/src/index.ts) | Подключает контент | TypeScript import |
| [packages/app/src/App.tsx](../../../../../../packages/app/src/App.tsx) | [packages/render/src/index.ts](../../../../../../packages/render/src/index.ts) | Подключает рендер | TypeScript import |
| [packages/app/src/App.tsx](../../../../../../packages/app/src/App.tsx) | [packages/save/src/index.ts](../../../../../../packages/save/src/index.ts) | Подключает сохранения | TypeScript import |
