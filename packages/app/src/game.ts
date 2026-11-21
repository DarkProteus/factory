// Игровой цикл и ввод: связывает sim, render и интерфейс. Состояние sim меняет
// только tick(state, commands); ввод превращается в команды через CommandQueue.
import { startMap } from '@factory/content';
import { createRenderer } from '@factory/render';
import { createState, tick, type Command, type CraftJob, type ItemStack, type SimState } from '@factory/sim';
import {
  applyKey,
  cellAt,
  clickCommand,
  CommandQueue,
  dropEmptyTool,
  itemCount,
  NO_TOOL,
  miningStep,
  overlayFor,
  selectBuilding,
  selectDemolish,
  selectMine,
  type Cell,
  type ToolState,
} from './input';
import { applyWindowKey, windowTarget } from './buildingUi';
import { netSummaryAt, type NetSummary } from './powerSummary';
import { clearSave, loadGame, saveGame, shouldAutosave, type KeyValueStorage } from './persist';

/** Шаг симуляции: 60 тиков в секунду. */
const TICK_MS = 1000 / 60;
/** Больше тиков за кадр не догоняем, чтобы не застыть после паузы вкладки. */
const MAX_TICKS_PER_FRAME = 5;

/** Зерно новой партии: стартовая карта задана данными, зерно нужно только генератору sim. */
const NEW_GAME_SEED = 1;

/** Сообщение об ошибке сохранения показывается 10 с. */
const MESSAGE_MS = 10_000;

/** localStorage или null: в приватном режиме и при запрете cookies обращение к нему бросает. */
function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface Game {
  /** Текущий инструмент и направление; объект меняется при каждом изменении. */
  getTools(): ToolState;
  subscribe(listener: () => void): () => void;
  chooseBuilding(id: string): void;
  chooseDemolish(): void;
  /** Сколько предметов с этим id (в том числе зданий) лежит в инвентаре. */
  itemCount(id: string): number;
  chooseMine(): void;
  /** Поворот призрака (клавиша R). */
  rotate(): void;
  /** Снять инструмент (клавиша Esc без открытых окон). */
  clearTool(): void;
  getTick(): number;
  /** Сообщение об ошибке сохранения или null; пропадает само через 10 с. */
  getMessage(): string | null;
  /** Удаляет сохранение и перезагружает страницу: партия начнётся заново. */
  newGame(): void;
  /** Иконка здания 24 px как data URL. */
  icon(id: string): string;
  /** Иконка предмета 24 px как data URL (та же отрисовка, что на карте). */
  itemIcon(id: string): string;
  /** Команда игрока: выполнится на ближайшем тике. */
  command(command: Command): void;
  /** Инвентарь и очередь ручного крафта; только для чтения, массивы меняются на тиках. */
  getInventory(): readonly ItemStack[];
  getCraftQueue(): readonly CraftJob[];
  /** Сводка сети под курсором и положение курсора в px канваса; null, если показывать нечего. */
  getNetSummary(): { summary: NetSummary; x: number; y: number } | null;
  /** Окно инвентаря (клавиша E). */
  isInventoryOpen(): boolean;
  setInventoryOpen(open: boolean): void;
  /** Состояние sim только для чтения: окно здания перечитывает его каждый кадр. */
  getState(): Readonly<SimState>;
  /** id здания с открытым окном или null; окно здания и окно инвентаря не открыты вместе. */
  getOpenBuilding(): number | null;
  closeBuilding(): void;
  destroy(): void;
}

/**
 * Если за время создания рендерера сработал signal (React StrictMode размонтировал
 * компонент), партия не загружается: иначе отменённый запуск «съест» битое сохранение
 * и сообщение об ошибке до настоящего запуска. Возвращает null.
 */
export async function startGame(host: HTMLElement, signal?: AbortSignal): Promise<Game | null> {
  const renderer = await createRenderer(host);
  if (signal?.aborted) {
    renderer.destroy();
    return null;
  }
  const storage = browserStorage();
  const loaded = loadGame(storage, () => createState(NEW_GAME_SEED));
  const state = loaded.state;
  let lastSavedTick = state.tick;
  /** После «Новой партии» страница перезагружается; сохранять её уже нельзя. */
  let discarded = false;
  let message: string | null = null;
  let messageTimer = 0;
  const queue = new CommandQueue();
  const listeners = new Set<() => void>();
  let tools: ToolState = { tool: NO_TOOL, dir: 0 };
  let inventoryOpen = false;
  let openBuilding: number | null = null;
  /** Положение курсора в px канваса; null, если курсор вне канваса. */
  let pointer: { x: number; y: number } | null = null;
  /** Левая кнопка мыши зажата на канвасе (нужна кирке). */
  let pressed = false;
  /** Клетка, на которой уже послан startMining. */
  let mined: Cell | null = null;

  const showMessage = (text: string | null) => {
    message = text;
    clearTimeout(messageTimer);
    if (text) messageTimer = window.setTimeout(() => showMessage(null), MESSAGE_MS);
    listeners.forEach((l) => l());
  };
  const save = () => {
    if (discarded) return;
    lastSavedTick = state.tick;
    const error = saveGame(storage, state);
    if (error) showMessage(error);
  };
  if (loaded.error) showMessage(loaded.error);

  const setTools = (next: ToolState) => {
    if (next === tools) return;
    tools = next;
    listeners.forEach((l) => l());
  };

  const owned = (id: string) => itemCount(state.inventory, id);
  /** Окна взаимоисключающие: открытие одного закрывает другое. */
  const setWindows = (inventory: boolean, building: number | null) => {
    if (inventory === inventoryOpen && building === openBuilding) return;
    inventoryOpen = inventory;
    openBuilding = building;
    listeners.forEach((l) => l());
  };
  const setInventoryOpen = (open: boolean) => setWindows(open, open ? null : openBuilding);

  const cellUnderPointer = (): Cell | null => {
    if (!pointer) return null;
    const [wx, wy] = renderer.camera.screenToWorld(pointer.x, pointer.y);
    return cellAt(wx, wy);
  };
  const locate = (e: PointerEvent) => {
    const rect = renderer.canvas.getBoundingClientRect();
    pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const canvas = renderer.canvas;
  const onMove = (e: PointerEvent) => locate(e);
  const onLeave = () => (pointer = null);
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    pressed = true;
    locate(e);
    const cell = cellUnderPointer();
    const command = cell && clickCommand(state, tools, cell);
    if (command) queue.push(command);
    // Без инструмента клик по зданию открывает его окно.
    const target = cell && windowTarget(state, tools.tool, cell);
    if (target) setWindows(false, target);
  };
  const onUp = () => (pressed = false);
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    // Esc сначала закрывает окно (инвентаря или здания), инструмент при этом остаётся.
    const closing = e.code === 'Escape' && (inventoryOpen || openBuilding !== null);
    const next = applyWindowKey({ inventory: inventoryOpen, building: openBuilding }, e.code);
    setWindows(next.inventory, next.building);
    if (!closing) setTools(applyKey(tools, e.code, undefined, owned));
  };
  const onHidden = () => {
    if (document.visibilityState === 'hidden') save();
  };
  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('pagehide', save);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerleave', onLeave);
  window.addEventListener('keydown', onKey);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('blur', onUp);

  // Камера новой партии стоит в центре стартовой карты.
  renderer.lookAt(startMap.width / 2, startMap.height / 2, 1.5);
  let acc = 0;
  let last = performance.now();
  let frame = 0;
  const loop = (now: number) => {
    acc = Math.min(acc + now - last, TICK_MS * MAX_TICKS_PER_FRAME);
    last = now;
    const step = miningStep(state, tools, mined, pressed, cellUnderPointer());
    mined = step.mined;
    if (step.command) queue.push(step.command);
    while (acc >= TICK_MS) {
      renderer.beforeTick(state);
      tick(state, queue.drain());
      acc -= TICK_MS;
    }
    // Снесённое здание закрывает своё окно.
    if (openBuilding !== null && !state.buildings[openBuilding]) setWindows(inventoryOpen, null);
    // Последний экземпляр построен: режим стройки сбрасывается.
    setTools(dropEmptyTool(state, tools));
    if (shouldAutosave(state.tick, lastSavedTick)) save();
    renderer.setOverlay(overlayFor(state, tools, cellUnderPointer()));
    renderer.draw(state, acc / TICK_MS);
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);

  return {
    getTools: () => tools,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    chooseBuilding: (id) => setTools(selectBuilding(tools, id, owned)),
    chooseDemolish: () => setTools(selectDemolish(tools)),
    itemCount: owned,
    chooseMine: () => setTools(selectMine(tools)),
    rotate: () => setTools(applyKey(tools, 'KeyR')),
    clearTool: () => setTools(applyKey(tools, 'Escape')),
    getTick: () => state.tick,
    getMessage: () => message,
    newGame() {
      discarded = true;
      clearSave(storage);
      location.reload();
    },
    icon: (id) => renderer.buildingIcon(id, 24),
    itemIcon: (id) => renderer.itemIcon(id, 24),
    command: (command) => queue.push(command),
    getInventory: () => state.inventory,
    getCraftQueue: () => state.craftQueue,
    getNetSummary() {
      const summary = netSummaryAt(state, tools, cellUnderPointer());
      return summary && pointer && { summary, x: pointer.x, y: pointer.y };
    },
    isInventoryOpen: () => inventoryOpen,
    setInventoryOpen,
    getState: () => state,
    getOpenBuilding: () => openBuilding,
    closeBuilding: () => setWindows(inventoryOpen, null),
    destroy() {
      cancelAnimationFrame(frame);
      clearTimeout(messageTimer);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', save);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('blur', onUp);
      renderer.destroy();
    },
  };
}
