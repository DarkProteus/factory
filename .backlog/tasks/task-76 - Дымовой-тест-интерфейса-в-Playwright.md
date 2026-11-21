---
id: TASK-76
title: Дымовой тест интерфейса в Playwright
status: In Progress
assignee: []
created_date: '2026-11-21T17:18:00Z'
updated_date: '2026-11-21T18:59:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - ui
  - render
modified_files:
  - package.json
  - pnpm-lock.yaml
  - playwright.config.ts
  - e2e/fixtures.ts
  - e2e/game.ts
  - e2e/smoke.spec.ts
  - e2e/console.spec.ts
  - .gitignore
  - .github/workflows/ci.yml
type: chore
ordinal: 82000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
app и render почти не проверяются тестами. Поставить @playwright/test, отдельная команда pnpm e2e (вне pnpm test), шаг в CI. Сценарий: открыть игру, построить бур, печь, манипулятор и сундук мышью, дождаться пластин, открыть окно здания и инвентарь, сохранить и загрузить, проверить, что в консоли нет ошибок.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm e2e проходит сценарий локально в headless-браузере с WebGL
- [x] #2 Тест падает при ошибке в консоли страницы
- [x] #3 Шаг e2e в ci.yml
- [x] #4 pnpm test зелёный и не запускает e2e
<!-- AC:END -->
