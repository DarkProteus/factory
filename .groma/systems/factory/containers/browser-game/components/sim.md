---
type: C4 Component
title: Ядро симуляции
status: stable
groma:
  id: sim
  parent: browser-game
  code:
    - scanner: typescript
      file: packages/sim/src/index.ts
      symbol: PACKAGE
    - scanner: typescript
      file: packages/sim/src/commands.ts
    - scanner: typescript
      file: packages/sim/src/hash.ts
    - scanner: typescript
      file: packages/sim/src/replay.ts
    - scanner: typescript
      file: packages/sim/src/rng.ts
    - scanner: typescript
      file: packages/sim/src/state.ts
    - scanner: typescript
      file: packages/sim/src/tick.ts
      symbol: tick
    - scanner: typescript
      file: packages/sim/src/grid.ts
    - scanner: typescript
      file: packages/sim/src/buildings.ts
    - scanner: typescript
      file: packages/sim/src/behaviors.ts
      symbol: runBehaviors
    - scanner: typescript
      file: packages/sim/src/miner.ts
      symbol: runMiner
    - scanner: typescript
      file: packages/sim/src/belt.ts
    - scanner: typescript
      file: packages/sim/src/inventory.ts
    - scanner: typescript
      file: packages/sim/src/crafter.ts
    - scanner: typescript
      file: packages/sim/src/transfer.ts
    - scanner: typescript
      file: packages/sim/src/inserter.ts
      symbol: runInserter
  technology: TypeScript
description: Хранит состояние мира и обновляет его раз в тик
---

Вся игра живёт здесь и работает без браузера. Ядро принимает команды от интерфейса («поставить бур в клетку 10,4») и с фиксированным шагом 60 тиков в секунду обновляет состояние. Поведения зданий (miner, belt, inserter, crafter, generator, lab, turret) реализованы кодом здесь, а параметры зданий берутся из Контента.

Ядро детерминировано: вместо Math.random и Date.now — генератор с зерном и счётчик тиков. Импортировать оно может только Контент; ESLint запрещает импорт render и app.

Сейчас пакет — заглушка, экспортирует только имя.
