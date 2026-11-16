---
type: C4 Component
title: Сохранения
status: stable
groma:
  id: save
  parent: browser-game
  code:
    - scanner: typescript
      file: packages/save/src/index.ts
      symbol: PACKAGE
  technology: TypeScript
description: Сохраняет и загружает состояние партии
---

Сериализует состояние Ядра симуляции и восстанавливает его.

Сейчас пакет — заглушка, экспортирует только имя.
