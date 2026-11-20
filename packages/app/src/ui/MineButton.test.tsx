import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Game } from '../game';
import { NO_TOOL, type Tool } from '../input';
import { MineButton } from './MineButton';

/** Минимальная заглушка игры: кнопке нужны только инструмент, подписка и выбор кирки. */
const fakeGame = (tool: Tool) =>
  ({ getTools: () => ({ tool, dir: 0 }), subscribe: () => () => {}, chooseMine: () => {} }) as unknown as Game;

describe('кнопка кирки', () => {
  it('подписана клавишей M и подсказкой', () => {
    const html = renderToStaticMarkup(<MineButton game={fakeGame(NO_TOOL)} />);
    expect(html).toContain('>M<');
    expect(html).toContain('Кирка');
    expect(html).not.toContain('active');
  });

  it('при выбранной кирке подсвечена как активный инструмент', () => {
    expect(renderToStaticMarkup(<MineButton game={fakeGame({ kind: 'mine' })} />)).toContain('btn active');
    expect(renderToStaticMarkup(<MineButton game={fakeGame({ kind: 'demolish' })} />)).not.toContain('active');
  });
});
