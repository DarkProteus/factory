import { buildings as contentBuildings } from '@factory/content';
import { footprintSize, topologyVersion, type BuildingDefs, type PlacedBuilding } from './buildings';
import type { SimState } from './state';

/**
 * Электросети: выведенный кеш, не состояние. Строится из зданий и сбрасывается
 * по topologyVersion (стройка и снос), поэтому в хеш и сохранение не входит.
 */
export interface Networks {
  /** id столба -> id сети (наименьший id столба в связной группе). */
  poleNet: Map<number, number>;
  /** id здания с энергией electric или generator -> id сети; без покрытия здания нет в карте. */
  buildingNet: Map<number, number>;
  /** id сети -> id потребителей (electric) по возрастанию. */
  consumers: Map<number, number[]>;
  /** id сети -> id генераторов по возрастанию. */
  generators: Map<number, number[]>;
  /** Провода: рёбра минимального остовного дерева по парам столбов в радиусе (меньший id первым). */
  wires: [number, number][];
}

interface Cache {
  version: number;
  networks: Networks;
}

const cache = new WeakMap<SimState, Cache>();

/** Сети текущего набора зданий; пересчитываются только после стройки или сноса. */
export function powerNetworks(state: SimState, defs: BuildingDefs = contentBuildings): Networks {
  const version = topologyVersion(state);
  const hit = cache.get(state);
  if (hit && hit.version === version) return hit.networks;
  const networks = buildNetworks(state, defs);
  cache.set(state, { version, networks });
  return networks;
}

function find(parent: Map<number, number>, id: number): number {
  let root = id;
  while (parent.get(root) !== root) root = parent.get(root)!;
  parent.set(id, root);
  return root;
}

/**
 * Объединяет группы так, что корнем остаётся меньший id: он и есть id сети.
 * Возвращает false, если столбы уже в одной группе (ребро лишнее для дерева).
 */
function union(parent: Map<number, number>, a: number, b: number): boolean {
  const ra = find(parent, a);
  const rb = find(parent, b);
  if (ra === rb) return false;
  if (ra < rb) parent.set(rb, ra);
  else parent.set(ra, rb);
  return true;
}

/** Пересекает ли отпечаток здания квадрат покрытия столба. */
function covers(pole: PlacedBuilding, coverage: number, b: PlacedBuilding, defs: BuildingDefs): boolean {
  const half = Math.floor(coverage / 2);
  const [w, h] = footprintSize(defs[b.type]!.size, b.dir);
  return b.x <= pole.x + half && b.x + w - 1 >= pole.x - half && b.y <= pole.y + half && b.y + h - 1 >= pole.y - half;
}

function push(map: Map<number, number[]>, key: number, value: number): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function buildNetworks(state: SimState, defs: BuildingDefs): Networks {
  // Object.values обходит числовые ключи по возрастанию: столбы и здания идут по id.
  const all = Object.values(state.buildings);
  const poles = all.filter((b) => defs[b.type]?.behavior === 'pole');
  const parent = new Map<number, number>(poles.map((p) => [p.id, p.id]));
  // Кандидаты в провода: все пары в радиусе. Kruskal берёт короткие первыми, при равенстве —
  // по паре id (столбы идут по возрастанию id, поэтому в паре меньший id первый).
  const edges: { d2: number; a: number; b: number }[] = [];
  for (let i = 0; i < poles.length; i++) {
    for (let j = i + 1; j < poles.length; j++) {
      const a = poles[i]!;
      const b = poles[j]!;
      const reach = Math.min(defs[a.type]!.wireReach ?? 0, defs[b.type]!.wireReach ?? 0);
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= reach * reach) edges.push({ d2, a: a.id, b: b.id });
    }
  }
  edges.sort((p, q) => p.d2 - q.d2 || p.a - q.a || p.b - q.b);
  const wires: [number, number][] = [];
  for (const e of edges) if (union(parent, e.a, e.b)) wires.push([e.a, e.b]);
  const poleNet = new Map<number, number>(poles.map((p) => [p.id, find(parent, p.id)]));
  const buildingNet = new Map<number, number>();
  const consumers = new Map<number, number[]>();
  const generators = new Map<number, number[]>();
  for (const b of all) {
    const kind = defs[b.type]?.energy?.kind;
    if (kind !== 'electric' && kind !== 'generator') continue;
    // При нескольких сетях здание в сети столба с меньшим id: столбы уже по возрастанию.
    const pole = poles.find((p) => covers(p, defs[p.type]!.coverage ?? 0, b, defs));
    if (!pole) continue;
    const net = poleNet.get(pole.id)!;
    buildingNet.set(b.id, net);
    push(kind === 'electric' ? consumers : generators, net, b.id);
  }
  return { poleNet, buildingNet, consumers, generators, wires };
}
