---
id: TASK-2
title: CI и деплой
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-16T15:54:00Z'
updated_date: '2026-11-16T16:15:00Z'
labels: []
dependencies:
  - TASK-1
documentation:
  - docs/design.md
modified_files:
  - tools/pages-base.test.ts
  - packages/app/vite.config.ts
  - package.json
  - .github/workflows/ci.yml
  - .github/workflows/deploy.yml
type: chore
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Веха M0. Главный риск проекта — не дойти до играбельной версии, поэтому демо должно быть доступно по ссылке с первой недели, а каждая веха заканчивается версией на GitHub Pages. Тесты в CI нужны ещё и как страховка детерминизма: хеш-тест из TASK-4 должен идти на каждый PR.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GitHub Actions запускает `pnpm test` на каждый pull request; упавший тест делает проверку красной
- [ ] #2 Пуш в ветку main собирает проект и выкладывает его на GitHub Pages
- [ ] #3 Выложенная сборка открывается по ссылке Pages без ошибок загрузки ресурсов (учтён базовый путь репозитория)
<!-- AC:END -->
