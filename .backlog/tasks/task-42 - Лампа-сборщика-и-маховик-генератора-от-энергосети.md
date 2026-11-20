---
id: TASK-42
title: Лампы бура, сборщика и маховик генератора от энергосети
status: Done
assignee: []
created_date: '2026-11-20T22:52:00Z'
updated_date: '2026-11-20T23:10:00Z'
labels:
  - m2
dependencies: []
references:
  - render
modified_files:
  - packages/render/src/powerView.ts
  - packages/render/src/draw/buildingsM2.ts
  - packages/render/src/draw/buildings.ts
  - packages/render/src/draw/buildingIcon.ts
  - packages/render/src/renderer.ts
  - packages/render/src/draw/lamps.test.ts
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
В packages/render/src/draw/buildingsM2.ts остались заглушки из M2: generatorLoad всегда 0, assemblerLamp не учитывает энергию. Подключить к powerStats(state) по style.md: лампа сборщика lamp-off без энергии; маховик генератора крутится пропорционально нагрузке, лампа генератора work/wait/off.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Лампа сборщика lamp-off вне сети и при удовлетворённости 0
- [x] #2 Маховик генератора вращается пропорционально нагрузке (выработка/мощность), без нагрузки стоит; лампа work/wait/off по style.md
- [x] #3 Скриншот проверен
- [x] #4 Лампа бура lamp-off вне сети и при удовлетворённости 0 (сейчас горит зелёной без энергии)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ревью: скриншоты m2-lamps-*. Лампа бура в работе и вращение маховика глазами не сняты, они покрыты тестами.
<!-- SECTION:NOTES:END -->
