import { buildings as contentBuildings } from '@factory/content';
import type { BuildingDefs } from './buildings';
import { runBelts } from './belt';
import { runCrafter } from './crafter';
import { runInserter } from './inserter';
import { runMiner } from './miner';
import type { SimState } from './state';

/**
 * Шаг поведений: здания по возрастанию id, поведение выбирается по BuildingDef.behavior.
 * Конвейеры идут последними, в порядке от низа по течению (см. belt.ts).
 */
export function runBehaviors(state: SimState, defs: BuildingDefs = contentBuildings): void {
  for (const b of Object.values(state.buildings)) {
    const def = defs[b.type];
    if (!def) continue;
    switch (def.behavior) {
      case 'miner':
        runMiner(state.map, b, def);
        break;
      case 'inserter':
        runInserter(state, b, def, defs);
        break;
      case 'crafter':
        runCrafter(b, def);
        break;
      default:
        // Остальные поведения появятся в следующих задачах.
        break;
    }
  }
  runBelts(state, defs);
}
