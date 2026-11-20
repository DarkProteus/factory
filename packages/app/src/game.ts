// Игровой цикл и ввод: связывает sim, render и интерфейс. Состояние sim меняет
// только tick(state, commands); ввод превращается в команды через CommandQueue.
import { createRenderer } from '@factory/render';
import { tick } from '@factory/sim';
import { createDemo, DEMO_CENTER } from './demo';
import {
  applyKey,
  cellAt,
  clickCommand,
  CommandQueue,
  NO_TOOL,
  overlayFor,
  selectBuilding,
  selectDemolish,
  type Cell,
  type ToolState,
} from './input';
import { clearSave, loadGame, saveGame, shouldAutosave, type KeyValueStorage } from './persist';

/** Шаг симуляции: 60 тиков в секунду. */
const TICK_MS = 1000 / 60;
/** Больше тиков за кадр не догоняем, чтобы не застыть после паузы вкладки. */
const MAX_TICKS_PER_FRAME = 5;

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
  getTick(): number;
  /** Сообщение об ошибке сохранения или null; пропадает само через 10 с. */
  getMessage(): string | null;
  /** Удаляет сохранение и перезагружает страницу: партия начнётся заново. */
  newGame(): void;
  /** Иконка здания 24 px как data URL. */
  icon(id: string): string;
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
  const loaded = loadGame(storage, createDemo);
  const state = loaded.state;
  let lastSavedTick = state.tick;
  /** После «Новой партии» страница перезагружается; сохранять её уже нельзя. */
  let discarded = false;
  let message: string | null = null;
  let messageTimer = 0;
  const queue = new CommandQueue();
  const listeners = new Set<() => void>();
  let tools: ToolState = { tool: NO_TOOL, dir: 0 };
  /** Положение курсора в px канваса; null, если курсор вне канваса. */
  let pointer: { x: number; y: number } | null = null;

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
    locate(e);
    const cell = cellUnderPointer();
    const command = cell && clickCommand(state, tools, cell);
    if (command) queue.push(command);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    setTools(applyKey(tools, e.code));
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

  renderer.lookAt(DEMO_CENTER.x, DEMO_CENTER.y, 1.5);
  let acc = 0;
  let last = performance.now();
  let frame = 0;
  const loop = (now: number) => {
    acc = Math.min(acc + now - last, TICK_MS * MAX_TICKS_PER_FRAME);
    last = now;
    while (acc >= TICK_MS) {
      renderer.beforeTick(state);
      tick(state, queue.drain());
      acc -= TICK_MS;
    }
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
    chooseBuilding: (id) => setTools(selectBuilding(tools, id)),
    chooseDemolish: () => setTools(selectDemolish(tools)),
    getTick: () => state.tick,
    getMessage: () => message,
    newGame() {
      discarded = true;
      clearSave(storage);
      location.reload();
    },
    icon: (id) => renderer.buildingIcon(id, 24),
    destroy() {
      cancelAnimationFrame(frame);
      clearTimeout(messageTimer);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', save);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', onKey);
      renderer.destroy();
    },
  };
}
