---
type: C4 Container
title: Браузерная игра
status: stable
groma:
  id: browser-game
  parent: factory
  technology: TypeScript, React, Vite
description: Одностраничное приложение, в котором работает вся игра
---

Единственный запускаемый контейнер: Vite собирает пять пакетов монорепо (sim, content, render, app, save) в один статический бандл. Он выкладывается на GitHub Pages и целиком работает в браузере игрока, сервера нет.

Пакеты — компоненты внутри этого бандла, а не отдельные процессы. Точка входа — packages/app/src/main.tsx.
