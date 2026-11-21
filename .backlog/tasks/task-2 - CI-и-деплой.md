---
id: TASK-2
title: CI и деплой
status: Done
assignee:
  - '@claude'
created_date: '2026-11-16T15:54:00Z'
updated_date: '2026-11-21T16:42:00Z'
labels: []
milestone: m-0
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
- [x] #1 GitHub Actions запускает `pnpm test` на каждый pull request; упавший тест делает проверку красной
- [x] #2 Пуш в ветку main собирает проект и выкладывает его на GitHub Pages
- [x] #3 Выложенная сборка открывается по ссылке Pages без ошибок загрузки ресурсов (учтён базовый путь репозитория)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Проверено: пробный PR #1 с падающим тестом — проверка test красная (закрыт). Push в main → Deploy success, https://darkproteus.github.io/factory/ отдаёт 200, ассеты с /factory/ тоже 200. BASE_PATH задаёт workflow, по умолчанию '/'.
<!-- SECTION:NOTES:END -->
