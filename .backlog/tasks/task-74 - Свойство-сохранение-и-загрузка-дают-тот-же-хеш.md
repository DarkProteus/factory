---
id: TASK-74
title: 'Свойство: сохранение и загрузка дают тот же хеш'
status: In Progress
assignee: []
created_date: '2026-11-21T17:18:00Z'
updated_date: '2026-11-21T18:45:00Z'
labels:
  - quality
milestone: m-7
dependencies: []
references:
  - save
  - sim
type: chore
ordinal: 80000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Сейчас сохранение проверяется примерами. Добавить свойство на fast-check: случайный мир (из связок propKit, если готовы, иначе из случайных шагов) → сохранить → загрузить → хеш совпадает, и дальнейшие N тиков дают одинаковые хеши у исходного и загруженного мира.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Свойство сохранения и загрузки на случайных мирах
- [ ] #2 После загрузки 200 тиков дают тот же хеш, что у исходного мира
- [ ] #3 pnpm test зелёный
<!-- AC:END -->
