import { buildings as contentBuildings } from '@factory/content';
import type { BuildingDefs } from './buildings';
import { runBelts } from './segments';
import { runCrafter } from './crafter';
import { runInserter } from './inserter';
import { runLab } from './lab';
import { runMiner } from './miner';
import { stepPower } from './power';
import type { SimState } from './state';

/**
 * Шаг поведений: сначала энергия (power.ts), затем здания по возрастанию id, поведение выбирается по BuildingDef.behavior.
 * Конвейеры и разделители идут последними, в порядке от низа по течению (см. segments.ts).
 */
export function runBehaviors(state: SimState, defs: BuildingDefs = contentBuildings): void {
  const power = stepPower(state, defs).byBuilding;
  for (const b of Object.values(state.buildings)) {
    const def = defs[b.type];
    if (!def) continue;
    switch (def.behavior) {
      case 'miner':
        runMiner(state, b, def, defs, power.get(b.id));
        continue;
      case 'inserter':
        runInserter(state, b, def, defs, power.get(b.id));
        continue;
      case 'crafter':
        runCrafter(b, def, power.get(b.id));
        continue;
      case 'lab':
        runLab(state, b, def, defs, power.get(b.id));
        continue;
      // Двигаются в runBelts ниже: конвейеры, подземные и разделители.
      case 'belt':
      case 'underground':
      case 'splitter':
      case 'filterSplitter':
      // Работают в stepPower (power.ts) выше: генератор вырабатывает энергию, столб соединяет сеть.
      case 'generator':
      case 'pole':
      // Пассивны: контейнер только хранит; turret — заготовка M4 (здания пока нет).
      case 'container':
      case 'turret':
        continue;
    }
    // Исчерпывающий switch: новое поведение без решения здесь не компилируется.
    const unreachable: never = def.behavior;
    void unreachable;
  }
  runBelts(state, defs);
}
