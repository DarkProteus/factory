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
    - scanner: typescript
      file: packages/save/src/errors.ts
      symbol: SaveError
    - scanner: typescript
      file: packages/save/src/validate.ts
      symbol: validateState
  technology: TypeScript
description: Сохраняет и загружает состояние партии
---

Чистые функции без DOM: serialize превращает состояние в строку JSON с номером версии формата, deserialize разбирает её обратно и проверяет форму и ссылки на Контент. На битый файл, неизвестную версию или здание, предмет, рецепт, которых нет в content, бросает SaveError с понятным сообщением. Загруженная партия неотличима от исходной по хешу. В интерфейс ещё не подключено: запись в localStorage или файл — будущая задача.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [packages/save/src/validate.ts](../../../../../../packages/save/src/validate.ts) | [packages/content/src/index.ts](../../../../../../packages/content/src/index.ts) | Проверяет ссылки | TypeScript import |
| [packages/save/src/index.ts](../../../../../../packages/save/src/index.ts) | [packages/sim/src/index.ts](../../../../../../packages/sim/src/index.ts) | Сериализует состояние | JSON с версией формата |
