import { technologies } from '@factory/content';
import { useLayoutEffect, useRef, useState } from 'react';
import type { Game } from '../game';
import {
  CARD_H,
  CARD_W,
  missingRequires,
  techIcon,
  techLayout,
  techStatus,
  techUnits,
  techUnlocks,
  tipPosition,
  unitSeconds,
  type TechStatus,
} from '../techUi';
import { Panel } from './BuildPanel';
import { itemName } from './names';
import { useTick } from './useTick';
import './research.css';

const LAYOUT = techLayout();
const sec = (s: number) => String(s).replace('.', ',');

/** Подсказка карточки: «Открывает:» с иконками 24 px; у закрытой — «Нужно: …» красным. */
function TechTip({ game, id, status, x, y }: { game: Game; id: string; status: TechStatus; x: number; y: number }) {
  const missing = missingRequires(game.getState(), id);
  // Размер известен только после отрисовки: меряем и ставим позицию так, чтобы подсказка вся была на экране.
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { left, top } = tipPosition(
      { x, y },
      { w: el.offsetWidth, h: el.offsetHeight },
      { w: window.innerWidth, h: window.innerHeight },
    );
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  });
  return (
    <div ref={ref} className="research-tip">
      <div className="rs-title">Открывает:</div>
      {techUnlocks(id).map((item) => (
        <div key={item} className="rs-row">
          <img src={game.itemIcon(item)} alt="" />
          <span>{itemName(item)}</span>
        </div>
      ))}
      {status === 'locked' && missing.length > 0 && (
        <div className="rs-need">Нужно: {missing.map((m) => technologies[m as keyof typeof technologies].name).join(', ')}</div>
      )}
    </div>
  );
}

/** Окно исследований (T): дерево слоями слева направо, клик по доступной технологии делает её активной. */
export function ResearchWindow({ game }: { game: Game }) {
  useTick(game);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  if (!game.isResearchOpen()) return null;
  const state = game.getState();
  const done = (id: string) => state.research.done.includes(id as never);
  const links = [...LAYOUT.links].sort((a, b) => Number(done(a.from)) - Number(done(b.from)));
  return (
    // Подсказка рядом с окном, а не внутри: transform окна ломает position: fixed.
    <>
      <div className="research-window">
        <Panel title="Исследования">
          <div className="research-scroll">
            <div className="research-tree" style={{ width: LAYOUT.width, height: LAYOUT.height }}>
              <svg className="research-links" width={LAYOUT.width} height={LAYOUT.height}>
                {links.map((l) => (
                  <path key={`${l.from}-${l.to}`} d={l.path} className={done(l.from) ? 'done' : undefined} />
                ))}
              </svg>
              {LAYOUT.cards.map(({ id, x, y }) => {
                const tech = technologies[id as keyof typeof technologies];
                const status = techStatus(state, id);
                const icon = techIcon(id);
                return (
                  <div
                    key={id}
                    className={`tech-card ${status}`}
                    style={{ left: x, top: y, width: CARD_W, height: CARD_H }}
                    onClick={() => (status === 'available' || status === 'active') && game.command({ type: 'setResearch', tech: id })}
                    onMouseMove={(e) => setHover({ id, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHover(null)}
                  >
                    {icon && <img className="tc-icon" src={game.itemIcon(icon, 32)} alt="" />}
                    <div className="tc-body">
                      <span className="tc-name">{tech.name}</span>
                      {status === 'done' ? (
                        <span className="tc-done">Изучено</span>
                      ) : (
                        <span className="tc-cost">
                          {Object.keys(tech.unit).map((item) => (
                            <img key={item} src={game.itemIcon(item, 16)} alt={itemName(item)} />
                          ))}
                          <span>
                            × {tech.units} · {sec(unitSeconds(tech))} с
                          </span>
                        </span>
                      )}
                    </div>
                    <i className="tc-bar" style={{ width: `${(techUnits(state, id) / tech.units) * 100}%` }} />
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>
      {hover && <TechTip game={game} id={hover.id} status={techStatus(state, hover.id)} x={hover.x} y={hover.y} />}
    </>
  );
}
