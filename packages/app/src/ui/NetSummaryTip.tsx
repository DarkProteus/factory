import { useLayoutEffect, useRef, useState } from 'react';
import type { Game } from '../game';
import './netSummary.css';
import { useTick } from './useTick';

/** Отступ панели от курсора, px. */
const OFFSET = 16;

/** Сводка сети под курсором: маленькая панель в 16 px правее и ниже курсора (docs/style-ui.md). */
export function NetSummaryTip({ game }: { game: Game }) {
  // Значения берутся из последнего тика: перечитываем вместе с кадром.
  useTick(game, 50);
  const hover = game.getNetSummary();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && (el.offsetWidth !== size.w || el.offsetHeight !== size.h)) setSize({ w: el.offsetWidth, h: el.offsetHeight });
  });
  if (!hover) return null;
  const { summary, x, y } = hover;
  // У правого и нижнего края окна панель переходит на другую сторону курсора, чтобы не обрезаться.
  const left = x + OFFSET + size.w > window.innerWidth ? x - OFFSET - size.w : x + OFFSET;
  const top = y + OFFSET + size.h > window.innerHeight ? y - OFFSET - size.h : y + OFFSET;
  return (
    <div ref={ref} className="net-tip" style={{ left, top }}>
      {summary.title && <div className="net-title">{summary.title}</div>}
      <div className="net-rows">
        {summary.rows.map((r) => (
          <div key={r.label} className={`net-row${r.bad ? ' bad' : ''}`}>
            <span className="net-label">{r.label}</span>
            {r.value && <span className="net-value">{r.value}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
