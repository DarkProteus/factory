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
        break;
      case 'inserter':
        runInserter(state, b, def, defs, power.get(b.id));
        break;
      case 'crafter':
        runCrafter(b, def, power.get(b.id));
        break;
      case 'lab':
        runLab(state, b, def, defs, power.get(b.id));
        break;
      default:
        // Остальные поведения появятся в следующих задачах.
        break;
    }
  }
  runBelts(state, defs);
}
