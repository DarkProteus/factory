// Сводка сети под курсором (docs/style-ui.md, «Сводка сети под курсором»). Чистая логика:
// состояние sim только читается, значения берутся из последнего тика (powerStats).
import { buildings, type BuildingDef } from '@factory/content';
import { buildingAt, POWER_SCALE, powerNetworks, powerStats, type SimState } from '@factory/sim';
import type { Cell, ToolState } from './input';

/** Строка сводки: подпись слева, значение справа; bad — цвет `bad`. */
export interface SummaryRow {
  label: string;
  value?: string;
  bad?: boolean;
}

/** Сводка: заголовок «СЕТЬ» и строки; у здания вне сети одна строка «НЕТ СЕТИ» без заголовка. */
export interface NetSummary {
  title: string | null;
  rows: SummaryRow[];
}

const TITLE = 'СЕТЬ';
const kw = (n: number) => `${n} кВт`;

/**
 * Строки сети: выработка, спрос и при нехватке — удовлетворённость в процентах (округление, но не выше 99, пока
 * сеть не удовлетворена полностью). Без спроса нехватки нет: у сети без работающих потребителей удовлетворённость 0 лишь по умолчанию.
 */
export function netRows(supply: number, demand: number, satisfaction: number): SummaryRow[] {
  const rows: SummaryRow[] = [
    { label: 'ВЫРАБОТКА', value: `${Math.min(supply, demand)} / ${kw(supply)}` },
    { label: 'СПРОС', value: kw(demand) },
  ];
  if (demand > 0 && satisfaction < POWER_SCALE) {
    rows.push({ label: 'НЕХВАТКА', value: `${Math.min(99, Math.round((satisfaction * 100) / POWER_SCALE))} %`, bad: true });
  }
  return rows;
}

/**
 * Сводка для клетки под курсором или null. Показывается вне режимов стройки и сноса, над столбом
 * и над зданием с энергией «электрическая» или «генератор»: в сети — строки сети, вне сети — «НЕТ СЕТИ».
 */
export function netSummaryAt(
  state: SimState,
  tools: ToolState,
  cell: Cell | null,
  defs: Readonly<Record<string, BuildingDef>> = buildings,
): NetSummary | null {
  if (!cell || tools.tool.kind === 'build' || tools.tool.kind === 'demolish') return null;
  const b = buildingAt(state, cell.x, cell.y);
  const def = b && defs[b.type];
  if (!b || !def) return null;
  const kind = def.energy?.kind;
  const nets = powerNetworks(state, defs);
  let net: number | undefined;
  if (def.behavior === 'pole') net = nets.poleNet.get(b.id);
  else if (kind === 'electric' || kind === 'generator') net = nets.buildingNet.get(b.id);
  else return null;
  if (net === undefined) return { title: null, rows: [{ label: 'НЕТ СЕТИ', bad: true }] };
  // Сети без потребителей и генераторов в статистике нет (столб сам по себе): считаем её пустой.
  const s = powerStats(state).networks.get(net) ?? { supply: 0, demand: 0, satisfaction: POWER_SCALE };
  return { title: TITLE, rows: netRows(s.supply, s.demand, s.satisfaction) };
}
