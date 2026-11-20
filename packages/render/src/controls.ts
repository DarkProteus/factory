// Управление камерой: перетаскивание средней или правой кнопкой, WASD и стрелки,
// колесо — зум к курсору. Камера — состояние render, в sim ничего не уходит.
import type { Camera } from './camera';

/** Скорость панорамы с клавиатуры, экранных px в секунду. */
const KEY_PAN_SPEED = 600;

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export interface Controls {
  /** Сдвигает камеру по зажатым клавишам за dtMs миллисекунд. */
  update(dtMs: number): void;
  detach(): void;
}

export function attachControls(canvas: HTMLCanvasElement, camera: Camera): Controls {
  const held = new Set<string>();
  let dragging = false;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 1 && e.button !== 2) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e: PointerEvent) => {
    if (dragging) camera.panScreen(e.movementX, e.movementY);
  };
  const onUp = (e: PointerEvent) => {
    if (e.button === 1 || e.button === 2) dragging = false;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    camera.zoomAt(-Math.sign(e.deltaY), e.clientX - rect.left, e.clientY - rect.top);
  };
  const onMenu = (e: Event) => e.preventDefault();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.code in KEYS) held.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => held.delete(e.code);
  const onBlur = () => held.clear();

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onMenu);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    update(dtMs) {
      let dx = 0;
      let dy = 0;
      for (const code of held) {
        dx += KEYS[code]![0];
        dy += KEYS[code]![1];
      }
      const d = (KEY_PAN_SPEED * dtMs) / 1000;
      if (dx || dy) camera.panScreen(-dx * d, -dy * d);
    },
    detach() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
