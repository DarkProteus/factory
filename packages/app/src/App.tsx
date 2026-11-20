import { PACKAGE as content } from '@factory/content';
import { createRenderer, PACKAGE as render, type Renderer } from '@factory/render';
import { PACKAGE as save } from '@factory/save';
import { PACKAGE as sim, tick } from '@factory/sim';
import { useEffect, useRef } from 'react';
import { createDemo, DEMO_CENTER } from './demo';

export const packages = [sim, content, render, save];

/** Шаг симуляции: 60 тиков в секунду. */
const TICK_MS = 1000 / 60;
/** Больше тиков за кадр не догоняем, чтобы не застыть после паузы вкладки. */
const MAX_TICKS_PER_FRAME = 5;

export function App() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let renderer: Renderer | null = null;
    let frame = 0;
    let cancelled = false;
    const state = createDemo();

    void createRenderer(host.current!).then((r) => {
      if (cancelled) return r.destroy();
      renderer = r;
      r.lookAt(DEMO_CENTER.x, DEMO_CENTER.y, 1.5);
      let acc = 0;
      let last = performance.now();
      const loop = (now: number) => {
        acc = Math.min(acc + now - last, TICK_MS * MAX_TICKS_PER_FRAME);
        last = now;
        while (acc >= TICK_MS) {
          r.beforeTick(state);
          tick(state, []);
          acc -= TICK_MS;
        }
        r.draw(state, acc / TICK_MS);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      renderer?.destroy();
    };
  }, []);

  return <div ref={host} style={{ position: 'fixed', inset: 0, overflow: 'hidden' }} />;
}
