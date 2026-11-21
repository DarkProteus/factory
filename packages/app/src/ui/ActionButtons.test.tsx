import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Game } from '../game';
import { NO_TOOL, type Tool, type ToolState } from '../input';
import { clearToolButton, inventoryButton, researchButton, rotateButton, ToolsPanel, WindowsPanel } from './ActionButtons';

/** Заглушка игры: кнопкам нужны только подписка, инструмент, окно инвентаря и сами действия. */
const fakeGame = (tool: Tool, inventoryOpen = false, researchOpen = false) => {
  const spies = { rotate: vi.fn(), clearTool: vi.fn(), setInventoryOpen: vi.fn(), setResearchOpen: vi.fn() };
  const game = {
    getTools: () => ({ tool, dir: 0 }),
    isInventoryOpen: () => inventoryOpen,
    isResearchOpen: () => researchOpen,
    subscribe: () => () => {},
    chooseDemolish: () => {},
    chooseMine: () => {},
    ...spies,
  } as unknown as Game;
  return { game, ...spies };
};
const build: Tool = { kind: 'build', building: 'conveyor' };
const st = (tool: Tool): ToolState => ({ tool, dir: 0 });
const html = (el: ReactElement) => renderToStaticMarkup(el);

describe('кнопка поворота (R)', () => {
  it('подписана клавишей R и подсказкой «Поворот»', () => {
    const out = html(rotateButton(fakeGame(build).game, st(build)));
    expect(out).toContain('>R<');
    expect(out).toContain('Поворот');
  });

  it('клик вызывает поворот, как клавиша R', () => {
    const { game, rotate } = fakeGame(build);
    rotateButton(game, st(build)).props.onClick();
    expect(rotate).toHaveBeenCalledTimes(1);
  });

  it('недоступна, пока не выбрано здание для стройки', () => {
    for (const tool of [NO_TOOL, { kind: 'demolish' }, { kind: 'mine' }] as Tool[]) {
      expect(rotateButton(fakeGame(tool).game, st(tool)).props.disabled).toBe(true);
    }
    expect(rotateButton(fakeGame(build).game, st(build)).props.disabled).toBe(false);
  });
});

describe('кнопка «Снять инструмент» (Esc)', () => {
  it('подписана ESC и подсказкой', () => {
    const out = html(clearToolButton(fakeGame(build).game, st(build)));
    expect(out).toContain('>ESC<');
    expect(out).toContain('Снять инструмент');
  });

  it('клик снимает инструмент, как клавиша Esc', () => {
    const { game, clearTool } = fakeGame(build);
    clearToolButton(game, st(build)).props.onClick();
    expect(clearTool).toHaveBeenCalledTimes(1);
  });

  it('недоступна, пока инструмент не выбран; доступна при любом выбранном', () => {
    expect(clearToolButton(fakeGame(NO_TOOL).game, st(NO_TOOL)).props.disabled).toBe(true);
    for (const tool of [build, { kind: 'demolish' }, { kind: 'mine' }] as Tool[]) {
      expect(clearToolButton(fakeGame(tool).game, st(tool)).props.disabled).toBe(false);
    }
  });
});

describe('кнопка инвентаря (E)', () => {
  it('подписана клавишей E и подсказкой «Инвентарь»', () => {
    const out = html(inventoryButton(fakeGame(NO_TOOL).game, false));
    expect(out).toContain('>E<');
    expect(out).toContain('Инвентарь');
  });

  it('подсвечена, пока окно открыто', () => {
    expect(html(inventoryButton(fakeGame(NO_TOOL, true).game, true))).toContain('btn active');
    expect(html(inventoryButton(fakeGame(NO_TOOL).game, false))).not.toContain('active');
  });

  it('клик открывает закрытое окно и закрывает открытое', () => {
    const closed = fakeGame(NO_TOOL);
    inventoryButton(closed.game, false).props.onClick();
    expect(closed.setInventoryOpen).toHaveBeenCalledWith(true);
    const open = fakeGame(NO_TOOL, true);
    inventoryButton(open.game, true).props.onClick();
    expect(open.setInventoryOpen).toHaveBeenCalledWith(false);
  });

  it('всегда доступна', () => {
    expect(inventoryButton(fakeGame(NO_TOOL).game, false).props.disabled).toBeFalsy();
  });
});

describe('кнопка исследований (T)', () => {
  it('подписана клавишей T и подсказкой «Исследования»', () => {
    const out = html(researchButton(fakeGame(NO_TOOL).game, false));
    expect(out).toContain('>T<');
    expect(out).toContain('Исследования');
  });

  it('подсвечена, пока окно открыто; клик открывает и закрывает', () => {
    expect(html(researchButton(fakeGame(NO_TOOL, false, true).game, true))).toContain('btn active');
    expect(html(researchButton(fakeGame(NO_TOOL).game, false))).not.toContain('active');
    const closed = fakeGame(NO_TOOL);
    researchButton(closed.game, false).props.onClick();
    expect(closed.setResearchOpen).toHaveBeenCalledWith(true);
    const open = fakeGame(NO_TOOL, false, true);
    researchButton(open.game, true).props.onClick();
    expect(open.setResearchOpen).toHaveBeenCalledWith(false);
  });
});

describe('панели', () => {
  it('панель инструментов: Снос, Кирка, Поворот, Снять в таком порядке', () => {
    const out = html(<ToolsPanel game={fakeGame(build).game} />);
    const at = ['Снос', 'Кирка', 'Поворот', 'Снять инструмент'].map((n) => out.indexOf(n));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('панель окон: инвентарь, затем исследования; отражает состояние окон', () => {
    expect(html(<WindowsPanel game={fakeGame(NO_TOOL, true).game} />)).toContain('btn active');
    expect(html(<WindowsPanel game={fakeGame(NO_TOOL, false, true).game} />)).toContain('btn active');
    const out = html(<WindowsPanel game={fakeGame(NO_TOOL).game} />);
    expect(out).not.toContain('active');
    expect(out.indexOf('Инвентарь')).toBeGreaterThanOrEqual(0);
    expect(out.indexOf('Исследования')).toBeGreaterThan(out.indexOf('Инвентарь'));
  });
});
