---
id: TASK-29
title: Разделитель
status: To Do
assignee: []
created_date: '2026-11-20T18:38:00Z'
labels:
  - m2
dependencies:
  - TASK-25
  - TASK-15
references:
  - sim
type: feature
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Решения: docs/design.md, раздел «Веха M2: решения». Исполнитель: implementer. После TASK-15, чтобы не править конвейеры дважды.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Предметы со входа сзади раздаются по кругу на выходы вперёд, влево, вправо, где стоит принимающая лента
- [ ] #2 Занятый или пустой выход пропускается; при заторе всех выходов предметы стоят и не теряются
- [ ] #3 Разделитель энергии не берёт; бенчмарк TASK-15 с разделителями укладывается в бюджет
<!-- AC:END -->
