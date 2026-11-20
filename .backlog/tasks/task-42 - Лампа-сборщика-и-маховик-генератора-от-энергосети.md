---
id: TASK-42
title: Лампы бура, сборщика и маховик генератора от энергосети
status: In Progress
assignee: []
created_date: '2026-11-20T22:52:00Z'
updated_date: '2026-11-20T23:03:00Z'
labels:
  - m2
dependencies: []
references:
  - render
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
В packages/render/src/draw/buildingsM2.ts остались заглушки из M2: generatorLoad всегда 0, assemblerLamp не учитывает энергию. Подключить к powerStats(state) по style.md: лампа сборщика lamp-off без энергии; маховик генератора крутится пропорционально нагрузке, лампа генератора work/wait/off.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Лампа сборщика lamp-off вне сети и при удовлетворённости 0
- [ ] #2 Маховик генератора вращается пропорционально нагрузке (выработка/мощность), без нагрузки стоит; лампа work/wait/off по style.md
- [ ] #3 Скриншот проверен
- [ ] #4 Лампа бура lamp-off вне сети и при удовлетворённости 0 (сейчас горит зелёной без энергии)
<!-- AC:END -->
