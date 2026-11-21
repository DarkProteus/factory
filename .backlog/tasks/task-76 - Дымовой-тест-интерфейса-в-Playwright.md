---
id: TASK-76
title: Дымовой тест интерфейса в Playwright
status: In Progress
assignee: []
created_date: '2026-11-21T17:18:00Z'
updated_date: '2026-11-21T18:19:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - ui
  - render
type: chore
ordinal: 82000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
app и render почти не проверяются тестами. Поставить @playwright/test, отдельная команда pnpm e2e (вне pnpm test), шаг в CI. Сценарий: открыть игру, построить бур, печь, манипулятор и сундук мышью, дождаться пластин, открыть окно здания и инвентарь, сохранить и загрузить, проверить, что в консоли нет ошибок.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm e2e проходит сценарий локально в headless-браузере с WebGL
- [ ] #2 Тест падает при ошибке в консоли страницы
- [ ] #3 Шаг e2e в ci.yml
- [ ] #4 pnpm test зелёный и не запускает e2e
<!-- AC:END -->
