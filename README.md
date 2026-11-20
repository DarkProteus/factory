# Завод с обороной

Браузерная 2D-игра про автоматизацию. Игрок строит завод на враждебной планете, а рост завода притягивает волны врагов. Оборона здесь часть логистики: турели стреляют патронами, которые едут к ним по конвейеру. Ориентиры по жанру: Factorio и Mindustry.

Дизайн-док: [`docs/design.md`](docs/design.md). Визуальный стиль: [`docs/style.md`](docs/style.md).

## Демо

Играбельная версия: **https://darkproteus.github.io/factory/**

Выкладывается из `main` через GitHub Actions (`.github/workflows/deploy.yml`).

## Управление камерой

- Перетаскивание средней или правой кнопкой мыши: панорама.
- `WASD` или стрелки: панорама с клавиатуры.
- Колесо мыши: зум к курсору.

## Запуск

Нужны Node.js и pnpm.

```sh
pnpm install
pnpm dev     # локальный запуск
pnpm test    # тесты (Vitest)
pnpm build   # проверка типов и сборка приложения
```

## Пакеты

Монорепозиторий pnpm workspaces. Вся игра живёт в ядре `sim`, которое работает без браузера.

- `packages/sim` — ядро симуляции. Чистый TypeScript, без DOM и рендера.
- `packages/content` — предметы, рецепты, здания и враги. Только данные.
- `packages/render` — отрисовка на PixiJS. Только читает состояние.
- `packages/app` — интерфейс на React, превращает ввод в команды для `sim`.
- `packages/save` — сохранения.

Границы: `sim` импортирует только `content`. В `sim` нет `Math.random`, `Date.now`, `render`, `app` и DOM. Случайность идёт от генератора с зерном, время от счётчика тиков. Тесты в `tools/` следят за границами пакетов и базовым путём сборки.

## Инструменты разработки

- [Backlog.md](https://github.com/MrLesk/Backlog.md) — задачи лежат в `.backlog/tasks/`.
- [groma.md](https://github.com/MrLesk/groma.md) — C4-карта архитектуры в `.groma/`.
- [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) — граф кода для навигации.
- [ast-grep](https://ast-grep.github.io) — поиск и правки по синтаксису.

Правила работы с агентом описаны в [`CLAUDE.md`](CLAUDE.md).
