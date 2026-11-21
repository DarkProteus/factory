---
id: TASK-66
title: Приглушать провода, которые исчезнут после постановки столба
status: To Do
assignee: []
created_date: '2026-11-21T13:14:00Z'
updated_date: '2026-11-21T16:43:00Z'
labels:
  - m3
milestone: m-3
dependencies: []
references:
  - render
priority: low
type: feature
ordinal: 72000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
При призраке столба пунктир показывает новые провода дерева, но сплошные провода, которые после постановки выпадут из дерева (wireTree), рисуются как обычно. Решение по виду сначала дописать в style.md (например, α 0.3).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Провода, которых не будет после постановки, приглушены по style.md
- [ ] #2 Скриншот проверен; pnpm test зелёный
<!-- AC:END -->
