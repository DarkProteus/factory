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
    - scanner: typescript
      file: packages/sim/src/propKit.ts
    - scanner: typescript
      file: packages/sim/src/mining.ts
    - scanner: typescript
      file: packages/sim/src/craftQueue.ts
    - scanner: typescript
      file: packages/sim/src/testKit.ts
    - scanner: typescript
      file: packages/sim/src/fuel.ts
    - scanner: typescript
      file: packages/sim/src/start.ts
    - scanner: typescript
      file: packages/sim/src/assembler.ts
      symbol: setRecipe
    - scanner: typescript
      file: packages/sim/src/segments.ts
      symbol: runBelts
    - scanner: typescript
      file: packages/sim/src/splitter.ts
    - scanner: typescript
      file: packages/sim/src/manual.ts
    - scanner: typescript
      file: packages/sim/src/network.ts
    - scanner: typescript
      file: packages/sim/src/power.ts
    - scanner: typescript
      file: packages/sim/src/research.ts
    - scanner: typescript
      file: packages/sim/src/underground.ts
  technology: TypeScript
description: Хранит состояние мира и обновляет его раз в тик
---

Вся игра живёт здесь и работает без браузера. Ядро принимает команды (build, demolish) и раз в тик обновляет состояние: сначала поведения зданий по возрастанию id — бур (miner) добывает руду и выкладывает её перед собой, манипулятор (inserter) переносит предметы, печь (crafter) плавит по рецептам, — затем все конвейеры (belt). Сундук (container) только хранит предметы. Остальные поведения из content (generator, lab, turret) пока не реализованы.

Состояние — простые данные (карта, здания, инвентарь игрока), сериализуется в JSON и хешируется для проверки детерминизма. При сносе содержимое здания уходит в инвентарь; если не помещается, снос запрещён. Вместо Math.random и Date.now — генератор с зерном и счётчик тиков; импортировать ядро может только Контент (следит ESLint). Инварианты проверяются property-тестами на fast-check.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [packages/sim/src/buildings.ts](../../../../../../packages/sim/src/buildings.ts) | [packages/content/src/index.ts](../../../../../../packages/content/src/index.ts) | Берёт параметры зданий | TypeScript import |
